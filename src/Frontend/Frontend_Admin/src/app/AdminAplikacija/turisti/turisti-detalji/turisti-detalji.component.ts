import { Component, OnInit } from '@angular/core';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  AdminTouristService,
  TouristActivity,
  TouristUserDetail,
} from '@core/services/admin-tourist.service';

export type ActivityTab = 'overview' | 'views' | 'likes' | 'saved' | 'reviews';

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  accommodation:   { label: 'Smeštaj',          icon: '🏨', color: '#3b82f6' },
  restaurant:      { label: 'Restorani',         icon: '🍽️', color: '#ef4444' },
  club:            { label: 'Klubovi',           icon: '🎵', color: '#8b5cf6' },
  cultural_site:   { label: 'Kulturna mesta',    icon: '🏛️', color: '#f59e0b' },
  monument:        { label: 'Spomenici',         icon: '🗿', color: '#d97706' },
  sports_facility: { label: 'Sport',             icon: '⚽', color: '#22c55e' },
  event:           { label: 'Događaji',          icon: '🎟️', color: '#ec4899' },
  attraction:      { label: 'Atrakcije',         icon: '🌿', color: '#10b981' },
  shop:            { label: 'Prodavnice',        icon: '🛍️', color: '#f97316' },
  other:           { label: 'Ostalo',            icon: '📍', color: '#6b7280' },
};

@Component({
  selector: 'app-turisti-detalji',
  templateUrl: './turisti-detalji.component.html',
  styleUrl:    './turisti-detalji.component.scss',
  imports: [RouterLink, DecimalPipe, UpperCasePipe, DateLocalPipe, ConfirmDialogComponent],
})
export class TuristiDetaljiComponent implements OnInit {
  tourist:  TouristUserDetail | null = null;
  activity: TouristActivity | null   = null;
  loading         = true;
  activityLoading = false;
  notFound        = false;

  suspendDialogOpen  = false;
  activateDialogOpen = false;
  deleteDialogOpen   = false;

  activeTab: ActivityTab = 'overview';

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private service: AdminTouristService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.notFound = true; this.loading = false; return; }

    this.service.getById(id).subscribe({
      next:  res => {
        this.tourist = res.data;
        this.loading = false;
        this.loadActivity(id);
      },
      error: () => { this.notFound = true; this.loading = false; },
    });
  }

  private loadActivity(id: number): void {
    this.activityLoading = true;
    this.service.getActivity(id).subscribe({
      next:  res => { this.activity = res.data; this.activityLoading = false; },
      error: ()  => { this.activityLoading = false; },
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  doToggle(): void {
    if (!this.tourist) return;
    this.suspendDialogOpen  = false;
    this.activateDialogOpen = false;

    const action$ = this.tourist.isActive
      ? this.service.suspend(this.tourist.id)
      : this.service.activate(this.tourist.id);

    action$.subscribe({
      next: res => {
        if (this.tourist && res.data) {
          this.tourist = { ...this.tourist, isActive: res.data.isActive };
        }
        this.ngOnInit();
      },
    });
  }

  doDelete(): void {
    if (!this.tourist) return;
    this.deleteDialogOpen = false;
    this.service.delete(this.tourist.id).subscribe({
      next: () => void this.router.navigateByUrl('/admin/turisti'),
    });
  }

  setTab(tab: ActivityTab): void { this.activeTab = tab; }

  // ── Display helpers ───────────────────────────────────────────────────────
  initials(name: string): string {
    return (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  languageFlag(code: string): string {
    const flags: Record<string, string> = {
      en: '🇬🇧', sr: '🇷🇸', de: '🇩🇪', it: '🇮🇹',
      fr: '🇫🇷', ru: '🇷🇺', es: '🇪🇸', nl: '🇳🇱',
    };
    return flags[code] ?? '🌐';
  }

  statusBadge(): string {
    if (!this.tourist) return '';
    if (!this.tourist.isActive)        return 'badge-red';
    if (!this.tourist.isEmailVerified) return 'badge-amber';
    return 'badge-green';
  }

  statusLabel(): string {
    if (!this.tourist) return '';
    if (!this.tourist.isActive)        return '⏸ Suspendovan';
    if (!this.tourist.isEmailVerified) return '⚠ Nepotvrđen email';
    return '✅ Aktivan';
  }

  get parsedInterests(): string[] {
    if (!this.tourist?.interests) return [];
    try {
      const parsed = JSON.parse(this.tourist.interests);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  // ── Category / activity helpers ───────────────────────────────────────────
  categoryLabel(postType: string): string {
    return CATEGORY_META[postType]?.label ?? postType;
  }

  categoryIcon(postType: string): string {
    return CATEGORY_META[postType]?.icon ?? '📍';
  }

  categoryColor(postType: string): string {
    return CATEGORY_META[postType]?.color ?? '#9ca3af';
  }

  /** Returns view-preference items with percentage relative to the max, for bar rendering */
  get viewPrefBars(): Array<{ postType: string; label: string; icon: string; color: string; count: number; pct: number }> {
    const prefs = this.activity?.viewPreferences ?? [];
    const max = prefs.length ? Math.max(...prefs.map(p => p.count), 1) : 1;
    return prefs.map(p => ({
      postType: p.postType,
      label:    this.categoryLabel(p.postType),
      icon:     this.categoryIcon(p.postType),
      color:    this.categoryColor(p.postType),
      count:    p.count,
      pct:      Math.round((p.count / max) * 100),
    }));
  }

  /** Engagement rate: likes / views (%) */
  get engagementRate(): number {
    const v = this.tourist?.viewsCount ?? 0;
    const l = this.tourist?.likesCount ?? 0;
    return v > 0 ? Math.round((l / v) * 100) : 0;
  }

  /** Save rate: saved / views (%) */
  get saveRate(): number {
    const v = this.tourist?.viewsCount ?? 0;
    const s = this.tourist?.savedCount ?? 0;
    return v > 0 ? Math.round((s / v) * 100) : 0;
  }

  /** Top 3 categories by view count for the overview summary */
  get topCategories(): Array<{ label: string; icon: string; color: string; count: number }> {
    return this.viewPrefBars.slice(0, 3).map(b => ({
      label: b.label, icon: b.icon, color: b.color, count: b.count,
    }));
  }

  reviewStars(rating: number): string {
    return '★'.repeat(Math.min(5, Math.max(0, rating))) +
           '☆'.repeat(Math.max(0, 5 - Math.min(5, Math.max(0, rating))));
  }

  reviewStatusClass(status: string): string {
    return { APPROVED: 'badge-green', REJECTED: 'badge-red' }[status] ?? 'badge-amber';
  }

  reviewStatusLabel(status: string): string {
    return { APPROVED: 'Odobrena', REJECTED: 'Odbijena', PENDING: 'Na čekanju' }[status] ?? status;
  }
}
