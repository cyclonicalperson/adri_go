import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Subscription } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AdminNotification } from '@core/models/user.model';
import { BadgeService } from '@core/services/badge.service';
import { NotificationHubService } from '@core/services/notification-hub.service';
import { SiteLanguageCode, SiteTranslateService } from '@core/services/site-translate.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  imports: [RouterModule, AsyncPipe, FormsModule],
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  auth = inject(AuthService);
  private badgeService = inject(BadgeService);
  readonly notifHub = inject(NotificationHubService);
  readonly i18n = inject(SiteTranslateService);

  notifications: AdminNotification[] = [];
  notifOpen = false;
  notifLoading = false;
  languageMenuOpen = false;
  showUnreadOnly = false;
  unreadCount = 0;
  adminSearchQuery = '';
  adminSearchOpen = false;
  adminSearchResults: AdminSearchSuggestion[] = [];
  readonly languages = this.i18n.languages;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.notifHub.connect();

    this.subs.push(
      this.notifHub.notifications$.subscribe(list => {
        this.notifications = list;
      }),
      this.notifHub.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadNotifications(): void {
    this.notifLoading = true;
    this.notifHub.list().subscribe({
      next: () => {
        this.notifLoading = false;
      },
      error: () => {
        this.notifLoading = false;
      },
    });
  }

  get visibleNotifications(): AdminNotification[] {
    return this.showUnreadOnly ? this.notifications.filter(n => !n.isRead) : this.notifications;
  }

  toggleNotifications(): void {
    this.languageMenuOpen = false;
    this.adminSearchOpen = false;
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) {
      this.loadNotifications();
    }
  }

  toggleLanguageMenu(): void {
    this.notifOpen = false;
    this.adminSearchOpen = false;
    this.languageMenuOpen = !this.languageMenuOpen;
  }

  changeLanguage(language: SiteLanguageCode): void {
    void this.i18n.setLanguage(language);
    this.languageMenuOpen = false;
  }

  markAllRead(): void {
    this.notifHub.markAllAsRead().subscribe(() => {
      this.badgeService.refresh();
    });
  }

  markRead(n: AdminNotification, event: Event): void {
    event.stopPropagation();
    if (n.isRead) return;
    this.notifHub.markAsRead(n.id).subscribe();
  }

  openNotification(n: AdminNotification): void {
    if (!n.isRead) {
      this.notifHub.markAsRead(n.id).subscribe();
    }

    this.notifOpen = false;
    const url = this.resolveNotificationUrl(n);
    if (url) {
      void this.router.navigateByUrl(url);
    }
  }

  relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Upravo';
    if (mins < 60) return `Prije ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Prije ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Juče';
    if (days < 7) return `Prije ${days} dana`;
    return new Date(dateStr).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  deleteNotification(n: AdminNotification, event: Event): void {
    event.stopPropagation();
    this.notifHub.delete(n.id).subscribe();
  }

  clearAllNotifications(event: Event): void {
    event.stopPropagation();
    if (this.notifications.length === 0) return;

    this.notifHub.deleteAll().subscribe();
  }

  onAdminSearchInput(query: string): void {
    this.adminSearchQuery = query;
    const normalized = this.normalizeAdminSearch(query);
    if (!normalized) {
      this.adminSearchResults = [];
      this.adminSearchOpen = false;
      return;
    }

    this.notifOpen = false;
    this.languageMenuOpen = false;
    this.adminSearchResults = this.buildAdminSearchResults(normalized);
    this.adminSearchOpen = this.adminSearchResults.length > 0;
  }

  clearAdminSearch(): void {
    this.adminSearchQuery = '';
    this.adminSearchResults = [];
    this.adminSearchOpen = false;
  }

  openAdminSearchResult(result: AdminSearchSuggestion): void {
    this.adminSearchOpen = false;
    this.adminSearchQuery = '';
    this.adminSearchResults = [];
    void this.router.navigate([result.url], { queryParams: result.queryParams ?? undefined });
  }

  private readonly titleMap: Record<string, { title: string; sub: string }> = {
    '/admin/dashboard': { title: 'Dashboard', sub: 'Pregled platforme' },
    '/admin/lokacije': { title: 'Destinacije', sub: 'Upravljanje destinacijama' },
    '/admin/aktivnosti': { title: 'Aktivnosti', sub: 'Upravljanje aktivnostima' },
    '/admin/events': { title: 'Dogadjaji', sub: 'Upravljanje dogadjajima' },
    '/admin/reviews': { title: 'Recenzije', sub: 'Moderacija recenzija' },
    '/admin/routes-management': { title: 'Rute', sub: 'Upravljanje rutama' },
    '/admin/users': { title: 'Admini', sub: 'Upravljanje administratorima' },
    '/admin/permissions': { title: 'Dozvole', sub: 'Upravljanje dozvolama' },
    '/admin/map-admin': { title: 'Mapa', sub: 'Interaktivna mapa destinacija' },
    '/admin/profile': { title: 'Moj profil', sub: 'Podaci o nalogu' },
    '/admin/zahtevi': { title: 'Zahtevi za registraciju', sub: 'Pregled i odobravanje zahteva' },
    '/admin/turisti': { title: 'Turisti', sub: 'Pregled korisničkih naloga turista' },
    // /admin/turisti/:id matches via startsWith — shows same title as list
  };

  pageTitle$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => this.resolveEntry()?.title ?? 'Admin'),
  );

  get pageSubtitle(): string {
    return this.resolveEntry()?.sub ?? '';
  }

  private resolveEntry() {
    const url = this.router.url.split('?')[0];
    for (const key of Object.keys(this.titleMap)) {
      if (url.startsWith(key)) {
        return this.titleMap[key];
      }
    }
    return null;
  }

  get initials(): string {
    return (this.auth.currentUser?.fullName ?? 'U')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role;
    return { superadmin: 'Super Administrator', admin: 'Administrator' }[role ?? ''] ?? (role ?? '');
  }

  get currentLanguageCode(): string {
    return this.i18n.currentLanguageOption.shortLabel;
  }

  notifIcon(type: string): string {
    return ({
      pending_review: '\u2B50',
      route_pending: '\u{1F5FA}\uFE0F',
      new_registration: '\u{1F464}',
      post_approved: '\u2705',
      post_rejected: '\u274C',
      system: '\u{1F514}',
    } as Record<string, string>)[type] ?? '\u{1F514}';
  }

  notifIconBg(type: string): string {
    return ({
      pending_review: '#fef2f2',
      route_pending: '#eff6ff',
      activity_pending: '#fff7ed',
      new_registration: '#eff6ff',
      post_approved: '#f0fdf4',
      post_rejected: '#fef2f2',
      system: '#f5f3ff',
    } as Record<string, string>)[type] ?? '#f9fafb';
  }

  private resolveNotificationUrl(notification: AdminNotification): string | null {
    const payload = notification.payload ?? {};
    const url = this.payloadString(payload, 'url');
    const postId = this.payloadNumber(payload, 'postId', 'post_id');
    const routeId = this.payloadNumber(payload, 'routeId', 'route_id');

    if (notification.type === 'new_registration') {
      return '/admin/zahtevi';
    }

    if (notification.type === 'pending_review') {
      return '/admin/reviews';
    }

    if ((notification.type === 'post_approved' || notification.type === 'post_rejected') && routeId) {
      return `/admin/routes-management/${routeId}`;
    }

    if ((notification.type === 'post_approved' || notification.type === 'post_rejected') && postId) {
      return `/admin/lokacije/${postId}`;
    }

    if (routeId) {
      return `/admin/routes-management/${routeId}`;
    }

    if (postId) {
      return `/admin/lokacije/${postId}`;
    }

    return url ?? this.fallbackNotificationUrl(notification.type);
  }

  private payloadString(payload: Record<string, unknown>, ...keys: string[]): string | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private payloadNumber(payload: Record<string, unknown>, ...keys: string[]): number | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }

    return null;
  }

  private fallbackNotificationUrl(type: string): string | null {
    switch (type) {
      case 'new_registration':
        return '/admin/zahtevi';
      case 'pending_review':
        return '/admin/reviews';
      case 'activity_pending':
        return '/admin/aktivnosti';
      default:
        return null;
    }
  }

  private buildAdminSearchResults(query: string): AdminSearchSuggestion[] {
    const role = this.auth.currentUser?.role ?? '';
    const canSeeSuperAdmin = role === 'superadmin';
    const catalog: AdminSearchSuggestion[] = [
      {
        title: 'Dashboard',
        subtitle: 'Pregled platforme, brojevi, nedavne aktivnosti',
        url: '/admin/dashboard',
        intent: 'Pregled sistema',
        keywords: ['dashboard', 'home', 'statistika', 'pregled', 'analytics', 'analitika'],
      },
      {
        title: 'Destinacije i lokacije',
        subtitle: 'Objave, objekti, eventi, filtriranje po regionu i tipu',
        url: '/admin/lokacije',
        intent: 'Upravljanje sadrzajem',
        keywords: ['lokacije', 'destinacije', 'objave', 'posts', 'objects', 'plaza', 'restoran', 'hotel', 'event', 'mapa'],
      },
      {
        title: 'Recenzije na cekanju',
        subtitle: 'Moderacija komentara i ocena turista',
        url: '/admin/reviews',
        queryParams: { status: 'PENDING' },
        intent: 'Moderacija',
        keywords: ['recenzije', 'reviews', 'pending', 'cekanju', 'odobri', 'odbij', 'komentari', 'rating'],
      },
      {
        title: 'Rute',
        subtitle: 'Kreiranje i uredjivanje turistickih ruta',
        url: '/admin/routes-management',
        intent: 'Planiranje ruta',
        keywords: ['rute', 'routes', 'itinerary', 'ruta', 'stajalista', 'waypoints'],
      },
      {
        title: 'Aktivnosti i tagovi',
        subtitle: 'Kategorije, aktivnosti i oznake za preporuke',
        url: '/admin/aktivnosti',
        intent: 'Katalog aktivnosti',
        keywords: ['aktivnosti', 'activity', 'tag', 'tags', 'kategorije', 'interesovanja'],
      },
      {
        title: 'Interaktivna mapa',
        subtitle: 'Vizuelni pregled destinacija i lokacija',
        url: '/admin/map-admin',
        intent: 'Mapa',
        keywords: ['mapa', 'map', 'geografija', 'koordinate', 'region'],
      },
      {
        title: 'Turisti',
        subtitle: 'Korisnicki nalozi turista i detalji naloga',
        url: '/admin/turisti',
        intent: 'Korisnici',
        keywords: ['turisti', 'tourists', 'korisnici', 'nalog', 'account'],
      },
      {
        title: 'Moj profil',
        subtitle: 'Licni podaci i podesavanja admin naloga',
        url: '/admin/profile',
        intent: 'Nalog',
        keywords: ['profil', 'profile', 'moj nalog', 'settings', 'podesavanja'],
      },
    ];

    if (canSeeSuperAdmin) {
      catalog.push(
        {
          title: 'Zahtevi za registraciju',
          subtitle: 'Odobravanje i odbijanje novih admin naloga',
          url: '/admin/zahtevi',
          intent: 'Superadmin tok',
          keywords: ['zahtevi', 'registracija', 'admin request', 'new registration', 'odobravanje', 'pending admins'],
        },
        {
          title: 'Admin korisnici',
          subtitle: 'Uloge, pristup i administratori',
          url: '/admin/users',
          intent: 'Administracija',
          keywords: ['admini', 'users', 'korisnici', 'uloge', 'roles', 'permission', 'dozvole'],
        },
        {
          title: 'Dozvole',
          subtitle: 'Pregled i upravljanje permisijama',
          url: '/admin/permissions',
          intent: 'Kontrola pristupa',
          keywords: ['dozvole', 'permissions', 'role', 'access', 'pristup'],
        },
      );
    }

    return catalog
      .map(item => ({ item, score: this.scoreAdminSearchItem(item, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, 6);
  }

  private scoreAdminSearchItem(item: AdminSearchSuggestion, query: string): number {
    const terms = query.split(/\s+/).filter(Boolean);
    const haystack = this.normalizeAdminSearch([
      item.title,
      item.subtitle,
      item.intent,
      ...item.keywords,
    ].join(' '));

    let score = 0;
    for (const term of terms) {
      if (this.normalizeAdminSearch(item.title).startsWith(term)) score += 35;
      if (haystack.split(/\s+/).some(part => part.startsWith(term))) score += 18;
      if (haystack.includes(term)) score += 10;
    }

    if (query.includes('pending') || query.includes('cekanj') || query.includes('odob')) {
      if (item.url.includes('reviews') || item.url.includes('zahtevi')) score += 12;
    }

    if (query.includes('map') || query.includes('mapa')) {
      if (item.url.includes('map-admin') || item.url.includes('lokacije')) score += 10;
    }

    return score;
  }

  private normalizeAdminSearch(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

interface AdminSearchSuggestion {
  title: string;
  subtitle: string;
  url: string;
  intent: string;
  keywords: string[];
  queryParams?: Record<string, string>;
}
