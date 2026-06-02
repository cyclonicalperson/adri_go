import {
  Component, OnInit, AfterViewChecked,
  ViewChild, ElementRef, computed, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule }          from '@angular/common';
import { FormsModule }           from '@angular/forms';
import { Router }                from '@angular/router';
import { ChatCard, ChatService, ChatMessage } from '../services/chat.service';
import { AuthService }           from '../services/auth.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { formatPostType }        from '../utils/post-type.utils';

@Component({
  selector:    'app-chat',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls:   ['./chat.component.css'],
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;
  @ViewChild('inputField')  private inputField!:  ElementRef<HTMLTextAreaElement>;

  inputText      = '';
  private shouldScroll = false;
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

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

  ngOnInit(): void {
    if (!this.hasMessages()) {
      setTimeout(() => this.inputField?.nativeElement.focus(), 100);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Slanje poruke ────────────────────────────────────────────

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

  // ── Akcije ───────────────────────────────────────────────────

  clearChat(): void {
    this.chat.clearChat();
    this.cdr.detectChanges();
    setTimeout(() => this.inputField?.nativeElement.focus(), 50);
  }

  goBack(): void    { window.history.back(); }
  goToLogin(): void { this.router.navigate(['/login']); }

  // ── UI helpers ───────────────────────────────────────────────

  autoResize(): void {
    const el = this.inputField?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }

  isUserMessage(msg: ChatMessage): boolean    { return msg.role === 'user'; }
  isErrorMessage(msg: ChatMessage): boolean   { return msg.status === 'error'; }
  isThinkingMessage(msg: ChatMessage): boolean { return msg.status === 'sending'; }

  openCard(card: ChatCard): void {
    if (!card.id) return;

    const appUrl = this.toAppUrl(card.type === 'route'
      ? card.mapUrl || card.detailUrl
      : card.detailUrl);

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

  getCardImage(card: ChatCard): string {
    const image = card.imageUrl || '';
    return resolveBackendAssetUrl(image, 'assets/Budva.jpg');
  }

  getCardCategory(card: ChatCard): string {
    if (card.type === 'route') return card.difficulty || 'Route';
    if (card.type === 'activity') return 'Activity';
    return formatPostType(card.postType || 'post');
  }

  getCardMeta(card: ChatCard): string[] {
    const meta: string[] = [];
    if (card.regionName) meta.push(card.regionName);
    if (card.type === 'route') {
      if (card.distanceKm != null) meta.push(`${Number(card.distanceKm).toFixed(1)} km`);
      if (card.durationMinutes != null) meta.push(`${card.durationMinutes} min`);
      return meta;
    }
    if (card.rating != null) meta.push(`★ ${Number(card.rating).toFixed(1)}`);
    if (card.reviewCount != null && card.reviewCount > 0) meta.push(`${card.reviewCount} reviews`);
    return meta;
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

  /**
   * Konvertuje Gemini Markdown odgovor u bezbedni HTML za prikaz.
   * Podržava: **bold**, *italic*, `code`, numerisane liste, bullet liste, linkove.
   * XSS-safe: escape HTML pre primene transformacija.
   */
  formatContent(content: string): string {
    if (!content) return '';

    // 1. Escape HTML specijalnih karaktera
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Bold i italic
    html = html
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,          '<em>$1</em>');

    // 3. Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 4. Numerisane liste (1. 2. 3. ...)
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered">$2</li>');
    html = html.replace(/(<li class="numbered">.*<\/li>\n?)+/g,
      m => `<ol>${m.replace(/\n/g,'')}</ol>`);

    // 5. Bullet liste (- ili *)
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>(?!class).*<\/li>\n?)+/g,
      m => `<ul>${m.replace(/\n/g,'')}</ul>`);

    // 6. Novi redovi → <br> (samo van list elemenata)
    html = html.replace(/\n/g, '<br>');

    // 7. Dvostruki <br> → vizuelni razmak između pasusa
    html = html.replace(/(<br>){2,}/g, '<br><br>');

    return html;
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {}
  }
}
