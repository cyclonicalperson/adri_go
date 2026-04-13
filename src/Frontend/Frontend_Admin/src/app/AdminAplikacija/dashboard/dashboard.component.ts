import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import {
  CdkDrag,
  CdkDropList,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDragDrop,
} from '@angular/cdk/drag-drop';

import { AuthService } from '@core/auth/auth.service';
import {
  AnalyticsService, DashboardStats, DailyVisit,
  PopularPost, TouristMovement,
} from '@core/services/analytics.service';
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
interface Preference { label: string; pct: number; color: string; }
interface CityBreakdown { label: string; pct: number; color: string; }

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
  allPosts: { postId: number; title: string; postType: string; lat: number; lng: number }[] = [];
  topActivities: { id: number; name: string }[] = [];
  recentReviews: { name: string; initials: string; comment: string; stars: string; status: string }[] = [];

  get activeTourists(): number { return this.stats?.totalTourists ?? 0; }
  get currentlyOnsite(): number { return Math.round((this.stats?.totalTourists ?? 0) * 0.04); }

  config!: DashboardConfig;

  pendingRequests: PendingRequest[] = [];

  activityLog: ActivityEntry[] = [];

  readonly preferences: Preference[] = [
    { label: '🏨 Smeštaj', pct: 38, color: '#22c55e' },
    { label: '🎭 Kultura', pct: 24, color: '#3b82f6' },
    { label: '⚽ Sport', pct: 18, color: '#f59e0b' },
    { label: '💆 Wellness', pct: 12, color: '#8b5cf6' },
    { label: '🍴 Hrana', pct: 8, color: '#ef4444' },
  ];

  readonly cityBreakdown: CityBreakdown[] = [
    { label: '🏙️ Žabljak', pct: 34, color: '#22c55e' },
    { label: '🏔️ Durmitor', pct: 22, color: '#3b82f6' },
    { label: '🌊 Budva', pct: 18, color: '#8b5cf6' },
    { label: '🏰 Kotor', pct: 14, color: '#f59e0b' },
    { label: '🌿 Tara kanjon', pct: 8, color: '#ef4444' },
    { label: '📍 Ostalo', pct: 4, color: '#d1d5db' },
  ];

  readonly categoryBreakdown = [
    { label: 'Smeštaj', icon: '🏨', pct: 31, color: '#22c55e' },
    { label: 'Restoran', icon: '🍽️', pct: 15, color: '#3b82f6' },
    { label: 'Atrakcije', icon: '🌟', pct: 15, color: '#f59e0b' },
    { label: 'Kulturni objekti', icon: '🏛️', pct: 15, color: '#8b5cf6' },
    { label: 'Sportski objekti', icon: '⚽', pct: 8, color: '#ec4899' },
    { label: 'Dogadjaji', icon: '🎟️', pct: 8, color: '#06b6d4' },
    { label: 'Klubovi', icon: '🎵', pct: 5, color: '#f97316' },
    { label: 'Ostalo', icon: '📍', pct: 3, color: '#d1d5db' },
  ];

  constructor(public auth: AuthService, private analytics: AnalyticsService, private http: HttpClient) { }

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
      stats: this.analytics.getDashboardStats(),
      visits: this.analytics.getDailyVisits(fmt(from), fmt(today)),
      objects: this.analytics.getPopularPosts(5),
      events: this.analytics.getPopularEvents(5),
      movements: this.analytics.getTouristMovements(),
    }).subscribe({
      next: res => {
        this.stats = res.stats.data;
        this.visits = res.visits.data;
        this.popularObjects = res.objects.data;
        this.popularEvents = res.events.data;
        this.movements = res.movements.data;
        this.loading = false;
        // Load posts for location map pins
        this.http.get<{ data: any[] }>(`${environment.apiUrl}/posts`, {
          params: new HttpParams().set('page', 1).set('pageSize', 200)
        }).subscribe(r => {
          this.allPosts = (r.data ?? []).filter((p: any) => p.lat && p.lng && p.postType !== 'event');
        });
        // Load pending registration requests for widget
        if (this.isSuperAdmin) {
          this.http.get<{ data: any[] }>(`${environment.apiUrl}/registrations`, {
            params: new HttpParams().set('status', 'pending').set('page', '1').set('pageSize', '5')
          }).subscribe(r => {
            this.pendingRequests = (r.data ?? []).map((req: any) => ({
              id: req.id,
              icon: req.isIndividual ? '👤' : '🏢',
              iconBg: req.isIndividual ? '#eff6ff' : '#f0fdf4',
              title: req.fullName,
              meta: (req.organizationName ?? 'Fizičko lice') + ' · Registracija',
            }));
          });
        }
        // Build activity log from recent posts
        this.http.get<{ data: any[] }>(`${environment.apiUrl}/posts`, {
          params: new HttpParams().set('page', '1').set('pageSize', '5').set('sortBy', 'createdAt').set('sortDir', 'desc')
        }).subscribe(r => {
          this.activityLog = (r.data ?? []).slice(0, 5).map((p: any) => ({
            icon: p.postType === 'event' ? '🎟️' : '📍',
            bg: p.postType === 'event' ? '#fffbeb' : '#f0fdf4',
            title: p.status === 'published' ? 'Objavljeno' : 'Kreirano (nacrt)',
            text: p.title + ' — ' + (p.region?.name ?? ''),
            time: this.timeAgo(p.createdAt),
          }));
        });
        // Load activities for top aktivnosti widget
        this.http.get<{ data: any[] }>(`${environment.apiUrl}/activities`, {
          params: new HttpParams().set('page', '1').set('pageSize', '5')
        }).subscribe(r => {
          this.topActivities = (r.data ?? []).slice(0, 5).map((a: any) => ({
            id: a.activityId, name: a.name,
          }));
        });
        // Load recent reviews
        this.http.get<{ data: any[] }>(`${environment.apiUrl}/reviews`, {
          params: new HttpParams().set('page', '1').set('pageSize', '3')
        }).subscribe(r => {
          this.recentReviews = (r.data ?? []).slice(0, 3).map((rv: any) => {
            const initials = (rv.touristName ?? '??').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
            return {
              name: rv.touristName ?? '—',
              initials,
              comment: rv.comment ?? '',
              stars: '★'.repeat(rv.rating) + '☆'.repeat(5 - rv.rating),
              status: rv.status,
            };
          });
        });
      },
      error: () => { this.loading = false; },
    });
  }

  get isSuperAdmin(): boolean { return this.auth.isRole('superadmin'); }
  get pendingCount(): number { return this.pendingRequests.length; }
  get totalVisits(): number { return this.visits.reduce((sum, v) => sum + v.count, 0); }
  get maxVisitCount(): number { return this.visits.length ? Math.max(...this.visits.map(v => v.count)) : 0; }
  readonly Math = Math;

  get movementMarkers(): MapMarker[] {
    return this.movements.map(m => ({
      id: m.regionId,
      lat: m.latitude,
      lng: m.longitude,
      label: `${m.regionName} (${m.visitCount} poseta)`,
    }));
  }

  /** All non-event posts with coordinates for the location map widget */
  get locationMarkers(): MapMarker[] {
    if (this.allPosts.length) {
      return this.allPosts.map(p => ({
        id: p.postId,
        lat: p.lat,
        lng: p.lng,
        label: p.title,
        category: p.postType,
      }));
    }
    // Fallback to movements if posts not loaded yet
    return this.movements.map(m => ({
      id: m.regionId,
      lat: m.latitude,
      lng: m.longitude,
      label: m.regionName,
    }));
  }

  // ── Config persistence ────────────────────────────────────────────────
  private storageKey(): string {
    return STORAGE_KEY_PREFIX + (this.auth.currentUser?.userId ?? 'default');
  }

  private loadConfig(): DashboardConfig {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) return JSON.parse(raw) as DashboardConfig;
    } catch { /* ignore */ }
    return this.isSuperAdmin
      ? { slots: [...DEFAULT_LAYOUT_ADMIN.slots] }
      : { slots: [...DEFAULT_LAYOUT_ORG.slots] };
  }

  saveConfig(): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.config));
  }

  resetConfig(): void {
    localStorage.removeItem(this.storageKey());
    this.config = this.loadConfig();
  }

  // ── Customise mode ────────────────────────────────────────────────────
  toggleCustomise(): void {
    this.customiseMode = !this.customiseMode;
    if (!this.customiseMode) { this.pickerOpen = false; this.saveConfig(); }
  }

  openPicker(): void { this.pickerOpen = true; }
  closePicker(): void { this.pickerOpen = false; }

  // ── Widget management ─────────────────────────────────────────────────
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
    return WIDGET_CATALOGUE.find(w => w.id === id)?.label ?? id;
  }

  get availableToAdd(): WidgetDef[] {
    const activeIds = new Set(this.config.slots.map(s => s.id));
    return WIDGET_CATALOGUE.filter(def =>
      !activeIds.has(def.id) && (!def.adminOnly || this.isSuperAdmin)
    );
  }

  // ── Chart helpers ─────────────────────────────────────────────────────
  barHeight(count: number): number {
    if (!this.visits.length) return 0;
    const max = Math.max(...this.visits.map(v => v.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  barColor(i: number): string { return ['bar-green', 'bar-blue', 'bar-amber'][i % 3]; }

  timeAgo(dateStr: string): string {
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

  get movementHeatPoints(): HeatPoint[] {
    const max = Math.max(...this.movements.map(m => m.visitCount), 1);
    return this.movements.map(m => ({
      lat: m.latitude,
      lng: m.longitude,
      intensity: m.visitCount / max,
      label: `${m.regionName}: ${m.visitCount} poseta`,
    }));
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
