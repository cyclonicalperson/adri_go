import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

import {
  CdkDrag, CdkDropList, CdkDragHandle,
  CdkDragPlaceholder, CdkDragDrop,
} from '@angular/cdk/drag-drop';

import { AuthService } from '@core/auth/auth.service';
import {
  AnalyticsService, DashboardStats, DailyVisit,
  PopularPost, TouristMovement,
} from '@core/services/analytics.service';
import { UserService } from '@core/services/user.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import {
  WidgetId, WidgetSlot, DashboardConfig, WidgetDef,
  WIDGET_CATALOGUE, DEFAULT_LAYOUT_ADMIN, DEFAULT_LAYOUT_ORG,
} from './dashboard-widget.model';
import { MapComponent, MapMarker, HeatPoint } from '@shared/components/map/map.component';

const STORAGE_KEY_PREFIX = 'th_dashboard_v1_';

interface PendingRequest { id: number; icon: string; iconBg: string; title: string; meta: string; }
interface ActivityEntry { icon: string; bg: string; title: string; text: string; time: string; }

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [RouterLink, DecimalPipe, CdkDrag, CdkDropList, CdkDragHandle, CdkDragPlaceholder, MapComponent],
})
export class DashboardComponent implements OnInit {
  loading = true;
  customiseMode = false;
  pickerOpen = false;

  stats: DashboardStats | null = null;
  visits: DailyVisit[] = [];
  popularObjects: PopularPost[] = [];
  popularEvents: PopularPost[] = [];
  movements: TouristMovement[] = [];
  allPosts: { id: number; title: string; postType: string; lat: number; lng: number }[] = [];
  topActivities: { id: number; name: string }[] = [];
  recentReviews: { name: string; initials: string; comment: string; stars: string; status: string }[] = [];

  config!: DashboardConfig;
  pendingRequests: PendingRequest[] = [];
  activityLog: ActivityEntry[] = [];

  preferences: { label: string; pct: number; color: string }[] = [];
  cityBreakdown: { label: string; pct: number; color: string; views: number }[] = [];

  // Computed from real posts data — filled in loadSecondaryData()
  categoryBreakdown: { label: string; icon: string; count: number; pct: number; color: string }[] = [];

  constructor(
    public auth: AuthService,
    private analytics: AnalyticsService,
    private userService: UserService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.config = this.loadConfig();
    this.fetchData();
  }

  private fetchData(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    forkJoin({
      stats: this.analytics.getDashboardStats().pipe(catchError(() => of({ data: null } as any))),
      visits: this.analytics.getDailyVisits(fmt(from), fmt(today)).pipe(catchError(() => of({ data: [] } as any))),
      objects: this.analytics.getPopularPosts(5).pipe(catchError(() => of({ data: [] } as any))),
      events: this.analytics.getPopularEvents(5).pipe(catchError(() => of({ data: [] } as any))),
      movements: this.analytics.getTouristMovements().pipe(catchError(() => of({ data: [] } as any))),
    }).subscribe({
      next: res => {
        this.stats = res.stats?.data ?? null;
        this.visits = res.visits?.data ?? [];
        this.popularObjects = res.objects?.data ?? [];
        this.popularEvents = res.events?.data ?? [];
        this.movements = res.movements?.data ?? [];
        this.loading = false;

        this.loadSecondaryData();
      },
      error: () => { this.loading = false; },
    });
  }

  private loadSecondaryData(): void {
    // Pinovi za mapu lokacija + raspored po tipu
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/posts`, {
      params: new HttpParams().set('page', 1).set('pageSize', 200)
    }).pipe(catchError(() => of({ data: [] }))).subscribe(r => {
      const all = r.data ?? [];
      this.allPosts = all
        .filter((p: any) => p.lat && p.lng && p.postType !== 'event')
        .map((p: any) => ({ id: p.id ?? p.postId, title: p.title, postType: p.postType, lat: +p.lat, lng: +p.lng }));

      // Compute categoryBreakdown from actual post types
      const nonEvents = all.filter((p: any) => p.postType !== 'event');
      const total = nonEvents.length || 1;
      const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
        accommodation: { label: 'Smeštaj', icon: '🏨', color: '#22c55e' },
        restaurant: { label: 'Restoran', icon: '🍽️', color: '#3b82f6' },
        attraction: { label: 'Atrakcije', icon: '🌟', color: '#f59e0b' },
        cultural_site: { label: 'Kulturni objekti', icon: '🏛️', color: '#8b5cf6' },
        sports_facility: { label: 'Sportski objekti', icon: '⚽', color: '#ec4899' },
        club: { label: 'Klubovi', icon: '🎵', color: '#f97316' },
        monument: { label: 'Spomenici', icon: '🗿', color: '#06b6d4' },
        shop: { label: 'Prodavnice', icon: '🛍️', color: '#84cc16' },
        other: { label: 'Ostalo', icon: '📍', color: '#d1d5db' },
      };
      const counts: Record<string, number> = {};
      for (const p of nonEvents) { counts[p.postType] = (counts[p.postType] ?? 0) + 1; }
      this.categoryBreakdown = Object.entries(counts)
        .filter(([, cnt]) => cnt > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([type, cnt]) => ({
          label: typeConfig[type]?.label ?? type,
          icon: typeConfig[type]?.icon ?? '📍',
          count: cnt,
          pct: Math.round((cnt / total) * 100),
          color: typeConfig[type]?.color ?? '#d1d5db',
        }));

      const typeViews: Record<string, number> = {};
      let totalViews = 0;
      for (const p of nonEvents) {
        const views = Number(p.viewCount ?? 0);
        totalViews += views;
        typeViews[p.postType] = (typeViews[p.postType] ?? 0) + views;
      }
      this.preferences = Object.entries(typeViews)
        .filter(([, views]) => views > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, views]) => ({
          label: `${typeConfig[type]?.icon ?? '📍'} ${typeConfig[type]?.label ?? type}`,
          pct: totalViews > 0 ? Math.round((views / totalViews) * 100) : 0,
          color: typeConfig[type]?.color ?? '#d1d5db',
        }));
    });

    this.analytics.getRegionPopularity().pipe(catchError(() => of({ data: [] } as any))).subscribe(r => {
      const data = r.data ?? [];
      const allViews = data.reduce((sum: number, x: any) => sum + Number(x.totalViews ?? 0), 0);
      const palette = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
      this.cityBreakdown = data
        .filter((x: any) => Number(x.totalViews ?? 0) > 0)
        .sort((a: any, b: any) => Number(b.totalViews ?? 0) - Number(a.totalViews ?? 0))
        .slice(0, 6)
        .map((x: any, i: number) => ({
          label: x.name,
          views: Number(x.totalViews ?? 0),
          pct: allViews > 0 ? Math.round((Number(x.totalViews ?? 0) / allViews) * 100) : 0,
          color: palette[i % palette.length],
        }));
    });

    // Pending registration requests (samo superadmin)
    if (this.isSuperAdmin) {
      // Admin registration pending — pozivamo pravi endpoint
      this.userService.getRegistrationRequests({ page: 1, pageSize: 5, status: 'pending' })
        .pipe(catchError(() => of({ data: [] } as any)))
        .subscribe(r => {
          this.pendingRequests = (r.data ?? []).map((req: any) => ({
            id: req.id,
            icon: req.isIndividual ? '👤' : '🏢',
            iconBg: req.isIndividual ? '#eff6ff' : '#f0fdf4',
            title: req.fullName,
            meta: (req.organizationName ?? 'Fizičko lice') + ' · Registracija',
          }));
        });
    }

    // Log aktivnosti — najnoviji postovi
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/posts`, {
      params: new HttpParams().set('page', 1).set('pageSize', 5)
    }).pipe(catchError(() => of({ data: [] }))).subscribe(r => {
      this.activityLog = (r.data ?? []).slice(0, 5).map((p: any) => ({
        icon: p.postType === 'event' ? '🎟️' : '📍',
        bg: p.postType === 'event' ? '#fffbeb' : '#f0fdf4',
        title: p.status === 'published' ? 'Objavljeno' : 'Kreirano (nacrt)',
        text: p.title + ' — ' + (p.region?.name ?? p.regionName ?? ''),
        time: this.timeAgo(p.createdAt),
      }));
    });

    // Top aktivnosti
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/activities`, {
      params: new HttpParams().set('page', 1).set('pageSize', 5)
    }).pipe(catchError(() => of({ data: [] }))).subscribe(r => {
      this.topActivities = (r.data ?? []).slice(0, 5).map((a: any) => ({
        id: a.id ?? a.activityId,
        name: a.name,
      }));
    });

    // Nedavne recenzije
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/reviews`, {
      params: new HttpParams().set('page', 1).set('pageSize', 3)
    }).pipe(catchError(() => of({ data: [] }))).subscribe(r => {
      this.recentReviews = (r.data ?? []).slice(0, 3).map((rv: any) => {
        const name = rv.touristName ?? rv.user?.fullName ?? '—';
        return {
          name,
          initials: name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
          comment: rv.comment ?? '',
          stars: '★'.repeat(rv.rating ?? 0) + '☆'.repeat(Math.max(0, 5 - (rv.rating ?? 0))),
          status: rv.status ?? 'PENDING',
        };
      });
    });
  }

  get isSuperAdmin(): boolean { return this.auth.isRole('superadmin'); }
  get pendingCount(): number { return this.stats?.pendingRegistrations ?? this.pendingRequests.length; }
  get totalVisits(): number { return this.visits.reduce((sum, v) => sum + v.count, 0); }
  get maxVisitCount(): number { return this.visits.length ? Math.max(...this.visits.map(v => v.count)) : 0; }
  get activeTourists(): number { return this.stats?.totalTourists ?? 0; }
  get currentlyOnsite(): number { return Math.round((this.stats?.totalTourists ?? 0) * 0.04); }
  readonly Math = Math;

  get movementMarkers(): MapMarker[] {
    return this.movements
      .filter(m => m.latitude && m.longitude)
      .map(m => ({
        id: m.regionId,
        lat: m.latitude,
        lng: m.longitude,
        label: `${m.regionName} (${m.visitCount} poseta)`,
        category: `${m.visitCount} poseta`,
      }));
  }

  get locationMarkers(): MapMarker[] {
    if (this.allPosts.length) {
      return this.allPosts.map(p => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        label: p.title,
        category: p.postType,
      }));
    }
    return this.movementMarkers;
  }

  get movementHeatPoints(): HeatPoint[] {
    const max = Math.max(...this.movements.map(m => m.visitCount), 1);
    return this.movements
      .filter(m => m.latitude && m.longitude)
      .map(m => ({
        lat: m.latitude,
        lng: m.longitude,
        intensity: m.visitCount / max,
        label: `${m.regionName}: ${m.visitCount} poseta`,
      }));
  }

  // ── Config persistence ─────────────────────────────────────────────────
  private storageKey(): string {
    return STORAGE_KEY_PREFIX + (this.auth.currentUser?.userId ?? 'default');
  }

  private loadConfig(): DashboardConfig {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) return this.migrateWidgetIds(JSON.parse(raw) as DashboardConfig);
    } catch { /* ignore */ }
    return this.isSuperAdmin
      ? { slots: [...DEFAULT_LAYOUT_ADMIN.slots] }
      : { slots: [...DEFAULT_LAYOUT_ORG.slots] };
  }

  /** Stari layout koristio je top_lokacije — mapiramo na top_destinacije */
  private migrateWidgetIds(cfg: DashboardConfig): DashboardConfig {
    const map: Record<string, WidgetId> = { top_lokacije: 'top_destinacije' };
    return {
      ...cfg,
      slots: cfg.slots.map(s => ({
        span: s.span,
        id: (map[s.id as string] ?? s.id) as WidgetId,
      })),
    };
  }

  saveConfig(): void { localStorage.setItem(this.storageKey(), JSON.stringify(this.config)); }
  resetConfig(): void { localStorage.removeItem(this.storageKey()); this.config = this.loadConfig(); }

  toggleCustomise(): void {
    this.customiseMode = !this.customiseMode;
    if (!this.customiseMode) { this.pickerOpen = false; this.saveConfig(); }
  }

  openPicker(): void { this.pickerOpen = true; }
  closePicker(): void { this.pickerOpen = false; }

  addWidget(def: WidgetDef): void {
    if (!this.config.slots.some(s => s.id === def.id)) {
      this.config = { ...this.config, slots: [...this.config.slots, { id: def.id, span: def.defaultSpan }] };
    }
    this.closePicker();
  }

  removeWidget(id: WidgetId): void {
    this.config = { ...this.config, slots: this.config.slots.filter(s => s.id !== id) };
  }

  toggleSpan(slot: WidgetSlot): void {
    slot.span = slot.span === 1 ? 2 : 1;
    this.config = { ...this.config, slots: [...this.config.slots] };
  }

  moveWidget(index: number, direction: -1 | 1): void {
    const slots = [...this.config.slots];
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    [slots[index], slots[target]] = [slots[target], slots[index]];
    this.config = { ...this.config, slots };
  }

  onDrop(event: CdkDragDrop<WidgetSlot[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const slots = [...this.config.slots];
    const item = slots.splice(event.previousIndex, 1)[0];
    slots.splice(event.currentIndex, 0, item);
    this.config = { ...this.config, slots };
  }

  widgetLabel(id: WidgetId): string {
    const mapped = id === ('top_lokacije' as WidgetId) ? 'top_destinacije' : id;
    return WIDGET_CATALOGUE.find(w => w.id === mapped)?.label ?? id;
  }

  get availableToAdd(): WidgetDef[] {
    const activeIds = new Set(this.config.slots.map(s => s.id));
    return WIDGET_CATALOGUE.filter(def =>
      !activeIds.has(def.id) && (!def.adminOnly || this.isSuperAdmin)
    );
  }

  barHeight(count: number): number {
    if (!this.visits.length) return 0;
    const max = Math.max(...this.visits.map(v => v.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  barColor(i: number): string { return ['bar-green', 'bar-blue', 'bar-amber'][i % 3]; }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} sat${hrs > 1 ? 'a' : ''}`;
    const days = Math.floor(hrs / 24);
    return `${days} dan${days > 1 ? 'a' : ''}`;
  }

  formatBarDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
  }

  heatColor(m: TouristMovement): string {
    const max = Math.max(...this.movements.map(x => x.visitCount), 1);
    const ratio = m.visitCount / max;
    if (ratio > 0.7) return '#22c55e';
    if (ratio > 0.4) return '#f59e0b';
    return '#3b82f6';
  }

  topBarWidth(val: number, list: PopularPost[]): number {
    const max = Math.max(...list.map(e => e.viewCount), 1);
    return Math.round((val / max) * 100);
  }

  pinLeft(m: TouristMovement): number {
    const lngs = this.movements.map(x => x.longitude);
    const min = Math.min(...lngs), max = Math.max(...lngs);
    return max === min ? 50 : Math.round(((m.longitude - min) / (max - min)) * 80 + 10);
  }

  pinTop(m: TouristMovement): number {
    const lats = this.movements.map(x => x.latitude);
    const min = Math.min(...lats), max = Math.max(...lats);
    return max === min ? 50 : Math.round((1 - (m.latitude - min) / (max - min)) * 70 + 10);
  }
}
