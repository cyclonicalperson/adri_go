import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';

import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
} from '@angular/cdk/drag-drop';

import { AuthService } from '@core/auth/auth.service';
import {
  AnalyticsService,
  DailyVisit,
  DashboardStats,
  RegionPopularity,
  TouristMovement,
} from '@core/services/analytics.service';
import { UserService } from '@core/services/user.service';
import { environment } from '@env/environment';
import {
  DashboardConfig,
  DEFAULT_LAYOUT_ADMIN,
  DEFAULT_LAYOUT_ORG,
  WidgetDef,
  WidgetId,
  WidgetSlot,
  WIDGET_CATALOGUE,
} from './dashboard-widget.model';
import { HeatPoint, MapComponent, MapMarker } from '@shared/components/map/map.component';

const STORAGE_KEY_PREFIX = 'adrigo_dashboard_v1_';

interface PendingRequest {
  id: number;
  icon: string;
  iconBg: string;
  title: string;
  meta: string;
}

interface ActivityEntry {
  icon: string;
  bg: string;
  title: string;
  text: string;
  time: string;
}

interface DashboardPost {
  id: number;
  title: string;
  postType: string;
  lat?: number | null;
  lng?: number | null;
  viewCount: number;
  regionName?: string | null;
  createdAt?: string;
  status?: string;
}

interface TopActivityItem {
  id: number;
  name: string;
  viewCount: number;
}

interface ReviewPreview {
  id: number;
  name: string;
  initials: string;
  comment: string;
  stars: string;
  status: string;
  entityName: string;
}

interface ContentBreakdownItem {
  label: string;
  icon: string;
  count: number;
  pct: number;
  color: string;
}

interface PreferenceItem {
  label: string;
  pct: number;
  color: string;
}

const CONTENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  accommodation: { label: 'Smeštaj', icon: '🏨', color: '#22c55e' },
  restaurant: { label: 'Restorani', icon: '🍽️', color: '#3b82f6' },
  club: { label: 'Klubovi', icon: '🎵', color: '#f97316' },
  cultural_site: { label: 'Kulturna mesta', icon: '🏛️', color: '#8b5cf6' },
  monument: { label: 'Spomenici', icon: '🗿', color: '#06b6d4' },
  sports_facility: { label: 'Sportski objekti', icon: '⚽', color: '#ec4899' },
  attraction: { label: 'Priroda i atrakcije', icon: '🌿', color: '#84cc16' },
  shop: { label: 'Prodavnice', icon: '🛍️', color: '#f59e0b' },
  other: { label: 'Ostalo', icon: '📍', color: '#9ca3af' },
};

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
  popularObjects: DashboardPost[] = [];
  popularEvents: DashboardPost[] = [];
  movements: TouristMovement[] = [];
  regionPopularity: RegionPopularity[] = [];
  allPosts: DashboardPost[] = [];
  topActivities: TopActivityItem[] = [];
  recentReviews: ReviewPreview[] = [];

  config: DashboardConfig = { slots: [] };
  pendingRequests: PendingRequest[] = [];
  activityLog: ActivityEntry[] = [];

  preferences: PreferenceItem[] = [];
  cityBreakdown: { label: string; pct: number; color: string; views: number }[] = [];
  categoryBreakdown: ContentBreakdownItem[] = [];

  readonly Math = Math;

  constructor(
    public auth: AuthService,
    private analytics: AnalyticsService,
    private userService: UserService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.config = this.sanitizeConfig(this.loadConfig());
    this.fetchData();
  }

  get isSuperAdmin(): boolean {
    return this.auth.isRole('superadmin');
  }

  get canViewAnalytics(): boolean {
    return this.auth.hasPermission('view_analytics');
  }

  get canManageContent(): boolean {
    return this.auth.hasPermission('manage_own_posts');
  }

  get canManageActivities(): boolean {
    return this.auth.hasPermission('manage_tags');
  }

  get canManageReviews(): boolean {
    return this.auth.hasPermission('manage_reviews');
  }

  get pendingCount(): number {
    return this.stats?.pendingRegistrations ?? this.pendingRequests.length;
  }

  get totalVisits(): number {
    return this.visits.reduce((sum, visit) => sum + visit.count, 0);
  }

  get maxVisitCount(): number {
    return this.visits.length ? Math.max(...this.visits.map(v => v.count)) : 0;
  }

  private fetchData(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    const fmt = (date: Date) => date.toISOString().split('T')[0];

    const analyticsRequests = this.canViewAnalytics
      ? {
          stats: this.analytics.getDashboardStats().pipe(catchError(() => of({ data: null } as any))),
          visits: this.analytics.getDailyVisits(fmt(from), fmt(today)).pipe(catchError(() => of({ data: [] } as any))),
          objects: this.analytics.getPopularPosts(5).pipe(catchError(() => of({ data: [] } as any))),
          events: this.analytics.getPopularEvents(5).pipe(catchError(() => of({ data: [] } as any))),
          movements: this.analytics.getTouristMovements().pipe(catchError(() => of({ data: [] } as any))),
          regions: this.analytics.getRegionPopularity().pipe(catchError(() => of({ data: [] } as any))),
        }
      : {
          stats: of({ data: null } as any),
          visits: of({ data: [] } as any),
          objects: of({ data: [] } as any),
          events: of({ data: [] } as any),
          movements: of({ data: [] } as any),
          regions: of({ data: [] } as any),
        };

    forkJoin(analyticsRequests).subscribe({
      next: res => {
        this.stats = res.stats?.data ?? null;
        this.visits = res.visits?.data ?? [];
        this.popularObjects = (res.objects?.data ?? []).map((item: any) => this.mapDashboardPost(item));
        this.popularEvents = (res.events?.data ?? []).map((item: any) => this.mapDashboardPost(item));
        this.movements = res.movements?.data ?? [];
        this.regionPopularity = res.regions?.data ?? [];
        this.cityBreakdown = this.buildCityBreakdown(this.regionPopularity);
        this.loading = false;
        this.loadSecondaryData();
      },
      error: () => {
        this.loading = false;
        this.loadSecondaryData();
      },
    });
  }

  private loadSecondaryData(): void {
    if (this.canViewAnalytics || this.canManageContent) {
      this.loadPostDerivedData();
    }

    if (this.canManageActivities) {
      this.loadTopActivities();
    } else {
      this.topActivities = [];
    }

    if (this.canManageReviews) {
      this.loadRecentReviews();
    } else {
      this.recentReviews = [];
    }

    if (this.isSuperAdmin) {
      this.loadPendingRequests();
    } else {
      this.pendingRequests = [];
    }
  }

  private loadPostDerivedData(): void {
    const params = new HttpParams()
      .set('page', 1)
      .set('pageSize', 100)
      .set('sortBy', 'createdAt')
      .set('sortDir', 'desc');

    this.http.get<{ data: any[] }>(`${environment.apiUrl}/posts`, { params }).pipe(
      catchError(() => of({ data: [] })),
    ).subscribe(res => {
      const allPosts = (res.data ?? []).map(item => this.mapDashboardPost(item));
      const locationPosts = allPosts.filter(post => post.postType !== 'event');

      this.allPosts = locationPosts.filter(post => !!post.lat && !!post.lng);
      this.activityLog = allPosts
        .slice()
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, 5)
        .map(post => ({
          icon: post.postType === 'event' ? '🎟️' : '📍',
          bg: post.postType === 'event' ? '#fffbeb' : '#f0fdf4',
          title: post.status === 'published' ? 'Objavljeno' : 'Sačuvano kao nacrt',
          text: `${post.title}${post.regionName ? ` — ${post.regionName}` : ''}`,
          time: this.timeAgo(post.createdAt ?? ''),
        }));

      this.categoryBreakdown = this.buildCategoryBreakdown(locationPosts);
      this.preferences = this.buildPreferenceBreakdown(locationPosts);

      if (!this.canViewAnalytics) {
        this.popularObjects = locationPosts
          .slice()
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 5);
        this.popularEvents = allPosts
          .filter(post => post.postType === 'event')
          .slice()
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 5);
      }
    });
  }

  private loadTopActivities(): void {
    const params = new HttpParams()
      .set('page', 1)
      .set('pageSize', 100);

    this.http.get<{ data: any[] }>(`${environment.apiUrl}/activities`, { params }).pipe(
      catchError(() => of({ data: [] })),
    ).subscribe(res => {
      this.topActivities = (res.data ?? [])
        .map((activity: any) => ({
          id: activity.id ?? activity.activityId,
          name: activity.name,
          viewCount: Number(activity.viewCount ?? 0),
        }))
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 5);
    });
  }

  private loadRecentReviews(): void {
    const params = new HttpParams()
      .set('status', 'PENDING')
      .set('page', 1)
      .set('pageSize', 5)
      .set('sortBy', 'createdAt')
      .set('sortDir', 'desc');

    this.http.get<{ data: any[] }>(`${environment.apiUrl}/reviews`, { params }).pipe(
      catchError(() => of({ data: [] })),
    ).subscribe(res => {
      this.recentReviews = (res.data ?? []).slice(0, 3).map((review: any) => {
        const name = review.touristName ?? '—';
        const rating = Number(review.rating ?? 0);
        return {
          id: review.reviewId ?? review.id,
          name,
          initials: name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
          comment: review.comment ?? '',
          stars: '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating)),
          status: review.status ?? 'PENDING',
          entityName: review.entityName ?? 'Sadržaj',
        };
      });
    });
  }

  private loadPendingRequests(): void {
    this.userService.getRegistrationRequests({ page: 1, pageSize: 5, status: 'pending' })
      .pipe(catchError(() => of({ data: [] } as any)))
      .subscribe(res => {
        this.pendingRequests = (res.data ?? []).map((request: any) => ({
          id: request.id,
          icon: request.isIndividual ? '👤' : '🏢',
          iconBg: request.isIndividual ? '#eff6ff' : '#f0fdf4',
          title: request.fullName,
          meta: request.organizationName ?? 'Fizičko lice',
        }));
      });
  }

  private mapDashboardPost(item: any): DashboardPost {
    return {
      id: item.id ?? item.postId,
      title: item.title ?? '',
      postType: item.postType ?? 'other',
      lat: item.lat ?? item.latitude ?? null,
      lng: item.lng ?? item.longitude ?? null,
      viewCount: Number(item.viewCount ?? 0),
      regionName: item.regionName ?? item.region?.name ?? null,
      createdAt: item.createdAt,
      status: item.status ?? 'published',
    };
  }

  private buildCategoryBreakdown(posts: DashboardPost[]): ContentBreakdownItem[] {
    const total = posts.length || 1;
    const counts = new Map<string, number>();

    posts.forEach(post => {
      counts.set(post.postType, (counts.get(post.postType) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([postType, count]) => ({
        label: CONTENT_TYPE_CONFIG[postType]?.label ?? postType,
        icon: CONTENT_TYPE_CONFIG[postType]?.icon ?? '📍',
        count,
        pct: Math.round((count / total) * 100),
        color: CONTENT_TYPE_CONFIG[postType]?.color ?? '#9ca3af',
      }));
  }

  private buildPreferenceBreakdown(posts: DashboardPost[]): PreferenceItem[] {
    const views = new Map<string, number>();
    let totalViews = 0;

    posts.forEach(post => {
      const viewCount = Number(post.viewCount ?? 0);
      totalViews += viewCount;
      views.set(post.postType, (views.get(post.postType) ?? 0) + viewCount);
    });

    return Array.from(views.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([postType, count]) => ({
        label: `${CONTENT_TYPE_CONFIG[postType]?.icon ?? '📍'} ${CONTENT_TYPE_CONFIG[postType]?.label ?? postType}`,
        pct: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
        color: CONTENT_TYPE_CONFIG[postType]?.color ?? '#9ca3af',
      }));
  }

  private buildCityBreakdown(data: RegionPopularity[]): { label: string; pct: number; color: string; views: number }[] {
    const totalViews = data.reduce((sum, item) => sum + Number(item.totalViews ?? 0), 0);
    const palette = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

    return data
      .filter(item => Number(item.totalViews ?? 0) > 0)
      .sort((a, b) => Number(b.totalViews ?? 0) - Number(a.totalViews ?? 0))
      .slice(0, 6)
      .map((item, index) => ({
        label: item.name,
        views: Number(item.totalViews ?? 0),
        pct: totalViews > 0 ? Math.round((Number(item.totalViews ?? 0) / totalViews) * 100) : 0,
        color: palette[index % palette.length],
      }));
  }

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
    return this.allPosts.map(post => ({
      id: post.id,
      lat: post.lat!,
      lng: post.lng!,
      label: post.title,
      category: CONTENT_TYPE_CONFIG[post.postType]?.label ?? post.postType,
      color: CONTENT_TYPE_CONFIG[post.postType]?.color ?? '#9ca3af',
    }));
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

  private storageKey(): string {
    return STORAGE_KEY_PREFIX + (this.auth.currentUser?.userId ?? 'default');
  }

  private loadConfig(): DashboardConfig {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) return JSON.parse(raw) as DashboardConfig;
    } catch {
      // ignore invalid local storage
    }

    return this.isSuperAdmin
      ? { slots: [...DEFAULT_LAYOUT_ADMIN.slots] }
      : { slots: [...DEFAULT_LAYOUT_ORG.slots] };
  }

  private sanitizeConfig(config: DashboardConfig): DashboardConfig {
    const slots = config.slots.filter(slot => this.canShowWidget(slot.id));
    if (slots.length > 0) {
      return { slots };
    }

    const fallback = this.isSuperAdmin ? DEFAULT_LAYOUT_ADMIN : DEFAULT_LAYOUT_ORG;
    return { slots: fallback.slots.filter(slot => this.canShowWidget(slot.id)) };
  }

  saveConfig(): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.config));
  }

  resetConfig(): void {
    localStorage.removeItem(this.storageKey());
    this.config = this.sanitizeConfig(this.loadConfig());
  }

  toggleCustomise(): void {
    this.customiseMode = !this.customiseMode;
    if (!this.customiseMode) {
      this.pickerOpen = false;
      this.saveConfig();
    }
  }

  openPicker(): void {
    this.pickerOpen = true;
  }

  closePicker(): void {
    this.pickerOpen = false;
  }

  addWidget(def: WidgetDef): void {
    if (!this.config.slots.some(slot => slot.id === def.id) && this.canShowWidget(def.id)) {
      this.config = { ...this.config, slots: [...this.config.slots, { id: def.id, span: def.defaultSpan }] };
    }
    this.closePicker();
  }

  removeWidget(id: WidgetId): void {
    this.config = { ...this.config, slots: this.config.slots.filter(slot => slot.id !== id) };
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
    return WIDGET_CATALOGUE.find(widget => widget.id === id)?.label ?? id;
  }

  get availableToAdd(): WidgetDef[] {
    const activeIds = new Set(this.config.slots.map(slot => slot.id));
    return WIDGET_CATALOGUE.filter(def => !activeIds.has(def.id) && this.canShowWidget(def.id));
  }

  private canShowWidget(id: WidgetId): boolean {
    const def = WIDGET_CATALOGUE.find(widget => widget.id === id);
    if (def?.adminOnly && !this.isSuperAdmin) {
      return false;
    }

    switch (id) {
      case 'kpi_stats':
        return this.isSuperAdmin && this.canViewAnalytics;
      case 'pending_requests':
        return this.isSuperAdmin;
      case 'recent_reviews':
        return this.canManageReviews;
      case 'top_aktivnosti':
        return this.canManageActivities;
      case 'activity_log':
        return this.canManageContent || this.canViewAnalytics;
      case 'visits_chart':
      case 'category_donut':
      case 'top_lokacije':
      case 'top_dogadjaji':
      case 'map_preview':
      case 'tourist_kpis':
      case 'tourist_map':
      case 'tourist_preferences':
      case 'city_breakdown':
        return this.canViewAnalytics;
      default:
        return true;
    }
  }

  barHeight(count: number): number {
    if (!this.visits.length || count === 0) return 2;
    const max = Math.max(...this.visits.map(v => v.count), 1);
    return Math.round((count / max) * 100);
  }

  barColor(index: number): string {
    return ['bar-green', 'bar-blue', 'bar-amber'][index % 3];
  }

  get visits30(): { date: string; count: number }[] {
    const map = new Map(this.visits.map(v => [v.date, v.count]));
    const result: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().split('T')[0];
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    return result;
  }

  get maxVisit30(): number {
    return Math.max(...this.visits30.map(v => v.count), 1);
  }

  barHeight30(count: number): number {
    if (count === 0) return 2;
    return Math.round((count / this.maxVisit30) * 100);
  }

  approveRequest(request: PendingRequest): void {
    this.userService.approveRegistration(request.id).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(item => item.id !== request.id);
        if (this.stats) {
          this.stats = {
            ...this.stats,
            pendingRegistrations: Math.max(0, (this.stats.pendingRegistrations ?? 1) - 1),
          };
        }
      },
    });
  }

  rejectRequest(request: PendingRequest): void {
    this.userService.rejectRegistration(request.id, { rejectionReason: 'Odbijeno od strane superadmina.' }).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(item => item.id !== request.id);
        if (this.stats) {
          this.stats = {
            ...this.stats,
            pendingRegistrations: Math.max(0, (this.stats.pendingRegistrations ?? 1) - 1),
          };
        }
      },
    });
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} sat${hours > 1 ? 'a' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} dan${days > 1 ? 'a' : ''}`;
  }

  formatBarDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
  }

  heatColor(movement: TouristMovement): string {
    const max = Math.max(...this.movements.map(item => item.visitCount), 1);
    const ratio = movement.visitCount / max;
    if (ratio > 0.7) return '#22c55e';
    if (ratio > 0.4) return '#f59e0b';
    return '#3b82f6';
  }

  topBarWidth(value: number, list: DashboardPost[]): number {
    const max = Math.max(...list.map(item => item.viewCount), 1);
    return Math.round((value / max) * 100);
  }

  topActivityWidth(value: number): number {
    const max = Math.max(...this.topActivities.map(item => item.viewCount), 1);
    return Math.round((value / max) * 100);
  }

  pinLeft(movement: TouristMovement): number {
    const lngs = this.movements.map(item => item.longitude);
    const min = Math.min(...lngs);
    const max = Math.max(...lngs);
    return max === min ? 50 : Math.round(((movement.longitude - min) / (max - min)) * 80 + 10);
  }

  pinTop(movement: TouristMovement): number {
    const lats = this.movements.map(item => item.latitude);
    const min = Math.min(...lats);
    const max = Math.max(...lats);
    return max === min ? 50 : Math.round((1 - (movement.latitude - min) / (max - min)) * 70 + 10);
  }
}
