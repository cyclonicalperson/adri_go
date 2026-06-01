import {
  Component, OnInit, AfterViewChecked,
  ViewChild, ElementRef, computed,
  ChangeDetectorRef, inject, Input, Output, EventEmitter
} from '@angular/core';
import { CommonModule }          from '@angular/common';
import { FormsModule }           from '@angular/forms';
import { Router }                from '@angular/router';
import { firstValueFrom }        from 'rxjs';
import { ChatCard, ChatService, ChatMessage } from '../services/chat.service';
import { AuthService }           from '../services/auth.service';
import { Location }              from '../services/location.service';
import { TouristRouteItem, TouristRoutesService } from '../services/tourist-routes.service';
import { RoutePlannerService }   from '../services/route-planner.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { formatPostType }        from '../utils/post-type.utils';

@Component({
  selector:    'app-chat-popup',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './chat-popup.component.html',
  styleUrls:   ['./chat-popup.component.css'],
})
export class ChatPopupComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;
  @ViewChild('inputField')  private inputField!:  ElementRef<HTMLTextAreaElement>;

  @Input()  isOpen = false;
  @Output() closePopup = new EventEmitter<void>();

  inputText      = '';
  private shouldScroll = false;
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly routesService = inject(TouristRoutesService);
  private readonly routePlanner = inject(RoutePlannerService);

  readonly messages    = this.chat.messages;
  readonly isLoading   = this.chat.isLoading;
  readonly error       = this.chat.error;
  readonly hasMessages = this.chat.hasMessages;

  readonly isLoggedIn  = computed(() => this.auth.isLoggedIn);
  readonly touristName = computed(() => this.auth.currentTourist?.name ?? null);

  readonly suggestions = [
    'What should I visit in Budva?',
    'Recommend beginner hiking routes',
    'Which restaurants are popular in Kotor?',
    'What is new in Durmitor?',
  ];

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  onClose(): void {
    this.closePopup.emit();
  }

  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isLoading()) return;

    this.inputText = '';
    this.shouldScroll = true;
    this.cdr.detectChanges();
    this.autoResize();

    await this.chat.sendMessage(text);
    this.shouldScroll = true;
    this.cdr.detectChanges();
  }

  async sendSuggestion(text: string): Promise<void> {
    if (this.isLoading()) return;
    this.inputText = text;
    await this.send();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  clearChat(): void {
    this.chat.clearChat();
    this.cdr.detectChanges();
    setTimeout(() => this.inputField?.nativeElement.focus(), 50);
  }

  goToLogin(): void { this.router.navigate(['/login']); }

  autoResize(): void {
    const el = this.inputField?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }

  isUserMessage(msg: ChatMessage): boolean     { return msg.role === 'user'; }
  isErrorMessage(msg: ChatMessage): boolean    { return msg.status === 'error'; }
  isThinkingMessage(msg: ChatMessage): boolean { return msg.status === 'sending'; }

  openLocationDetails(location: Location): void {
    if (!location.id) return;
    this.closePopup.emit();
    this.router.navigate(['/location-details', location.id]);
  }

  openCard(card: ChatCard): void {
    if (!card.id) return;

    const appUrl = this.toAppUrl(card.type === 'route'
      ? card.mapUrl || card.detailUrl
      : card.detailUrl);

    this.closePopup.emit();

    if (appUrl) {
      this.router.navigateByUrl(appUrl);
      return;
    }

    if (card.type === 'route') {
      this.router.navigate(['/map-home'], { queryParams: { routeId: card.id } });
      return;
    }

    this.router.navigate(['/location-details', card.id]);
  }

  openRouteOnMap(route: TouristRouteItem): void {
    // Ako ruta vec ima waypoints, direktno otvaramo mapu
    if (route.waypoints && route.waypoints.length > 0) {
      this.loadRouteOnMap(route);
      return;
    }
    // Inace fetchujemo puni detalj rute (getRoutes() ne vraca waypoints)
    firstValueFrom(this.routesService.getRouteById(route.id)).then(full => {
      if (full && full.waypoints && full.waypoints.length > 0) {
        this.loadRouteOnMap(full);
      } else {
        // Nema waypoints — idemo na /routes stranicu
        this.closePopup.emit();
        this.router.navigate(['/routes']);
      }
    }).catch(() => {
      this.closePopup.emit();
      this.router.navigate(['/routes']);
    });
  }

  private loadRouteOnMap(route: TouristRouteItem): void {
    this.routePlanner.replaceStops(
      this.routesService.routeToPlannerStops(route),
      { plannerMode: true, scenicMode: false, travelMode: 'walking', sourceRouteId: route.id },
    );
    this.closePopup.emit();
    // Navigiramo sa query parametrom koji prisiljava mapu da refreshuje planner state
    // cak i kada je korisnik vec na /map-home stranici
    this.router.navigate(['/map-home'], {
      queryParams: { plannerRefresh: Date.now() },
      queryParamsHandling: 'merge',
    });
  }

  openActivityLocation(location: Location): void {
    if (!location.id) return;
    this.closePopup.emit();
    this.router.navigate(['/location-details', location.id]);
  }

  getRouteImage(route: TouristRouteItem): string {
    const images = route.images;
    let first = '';
    if (Array.isArray(images)) first = images[0] || '';
    else if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        first = Array.isArray(parsed) ? (parsed[0] || '') : images;
      } catch { first = images; }
    }
    return resolveBackendAssetUrl(first, 'assets/Budva.jpg');
  }

  getRouteDifficultyLabel(difficulty?: string): string {
    const map: Record<string, string> = {
      easy: 'Lako', medium: 'Srednje', hard: 'Teško',
      beginner: 'Početnik', advanced: 'Napredno',
    };
    return map[(difficulty || '').toLowerCase()] || difficulty || 'Ruta';
  }

  formatRouteDuration(minutes: number): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }

  getLocationImage(location: Location): string {
    const image = this.firstImage(location);
    return resolveBackendAssetUrl(image, 'assets/Budva.jpg');
  }

  getLocationCategory(location: Location): string {
    return formatPostType(location.postType || location.category);
  }

  getCardImage(card: ChatCard): string {
    return resolveBackendAssetUrl(card.imageUrl || '', 'assets/Budva.jpg');
  }

  getCardCategory(card: ChatCard): string {
    if (card.type === 'route') return card.difficulty || 'Ruta';
    if (card.type === 'activity') return 'Aktivnost';
    return formatPostType(card.postType || 'post');
  }

  getCardMeta(card: ChatCard): string[] {
    const meta: string[] = [];
    if (card.regionName) meta.push(card.regionName);

    if (card.type === 'route') {
      if (card.distanceKm != null) meta.push(`${Number(card.distanceKm).toFixed(1)} km`);
      if (card.durationMinutes != null) meta.push(this.formatRouteDuration(card.durationMinutes));
      return meta;
    }

    if (card.rating != null) meta.push(`★ ${Number(card.rating).toFixed(1)}`);
    if (card.reviewCount != null && card.reviewCount > 0) meta.push(`${card.reviewCount} reviews`);
    return meta;
  }

  hasRouteCards(msg: ChatMessage): boolean {
    return !!(msg.routeCards && msg.routeCards.length > 0);
  }

  hasActivityCards(msg: ChatMessage): boolean {
    return !!(msg.activityLocationCards && msg.activityLocationCards.length > 0);
  }

  private firstImage(location: Location): string {
    if (location.imageUrl) return location.imageUrl;
    const images = location.images;
    if (!images) return '';
    if (Array.isArray(images)) return images[0] || '';
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? (parsed[0] || '') : images;
    } catch {
      return images;
    }
  }

  private toAppUrl(url?: string | null): string | null {
    if (!url) return null;

    try {
      const parsed = new URL(url, window.location.origin);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return url.startsWith('/') ? url : null;
    }
  }

  formatContent(content: string): string {
    if (!content) return '';
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,          '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered">$2</li>');
    html = html.replace(/(<li class="numbered">.*<\/li>\n?)+/g,
      m => `<ol>${m.replace(/\n/g,'')}</ol>`);
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>(?!class).*<\/li>\n?)+/g,
      m => `<ul>${m.replace(/\n/g,'')}</ul>`);
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/(<br>){2,}/g, '<br><br>');
    return html;
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {}
  }
}
