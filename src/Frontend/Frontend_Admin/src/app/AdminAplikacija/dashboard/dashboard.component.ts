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
import {
  WidgetId, WidgetSlot, DashboardConfig, WidgetDef,
  WIDGET_CATALOGUE, DEFAULT_LAYOUT_ADMIN, DEFAULT_LAYOUT_ORG,
} from './dashboard-widget.model';

const STORAGE_KEY_PREFIX = 'th_dashboard_v1_';

interface PendingRequest { id: number; icon: string; iconBg: string; title: string; meta: string; }
interface ActivityEntry { icon: string; bg: string; title: string; text: string; time: string; }
interface Preference { label: string; pct: number; color: string; }
interface CityBreakdown { label: string; pct: number; color: string; }

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [RouterLink, DecimalPipe, CdkDrag, CdkDropList, CdkDragHandle, CdkDragPlaceholder],
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

  activeTourists = 8294;
  currentlyOnsite = 312;

  config!: DashboardConfig;

  readonly pendingRequests: PendingRequest[] = [
    { id: 1, icon: '🏠', iconBg: '#f0fdf4', title: 'Hotel "Kopaonik Star"', meta: 'Ana Petrović · Lokacija' },
    { id: 2, icon: '🎾', iconBg: '#eff6ff', title: 'Teniski kamp 2026', meta: 'SC Novak · Aktivnost' },
    { id: 3, icon: '🎵', iconBg: '#fffbeb', title: 'Exit Festival 2026', meta: 'Exit d.o.o. · Dogadjaj' },
  ];

  readonly activityLog: ActivityEntry[] = [
    { icon: '✅', bg: '#f0fdf4', title: 'Lokacija odobrena', text: 'Hotel "Šumadija" — Kragujevac', time: '12 min' },
    { icon: '🎟️', bg: '#fffbeb', title: 'Novi dogadjaj kreiran', text: 'Jazz veče — Kafić Centar', time: '1 sat' },
    { icon: '⚠️', bg: '#fef2f2', title: 'Recenzija označena', text: 'Negativan komentar — Hotel Zlatibor', time: '2 sata' },
    { icon: '👤', bg: '#eff6ff', title: 'Novi admin dodat', text: 'Jelena Marić — Novi Sad', time: '5 sati' },
    { icon: '🎯', bg: '#f5f3ff', title: 'Aktivnost odobrena', text: 'Teniski kamp — SC Novak', time: '1 dan' },
  ];

  readonly preferences: Preference[] = [
    { label: '🏨 Smeštaj', pct: 38, color: '#22c55e' },
    { label: '🎭 Kultura', pct: 24, color: '#3b82f6' },
    { label: '⚽ Sport', pct: 18, color: '#f59e0b' },
    { label: '💆 Wellness', pct: 12, color: '#8b5cf6' },
    { label: '🍴 Hrana', pct: 8, color: '#ef4444' },
  ];

  readonly cityBreakdown: CityBreakdown[] = [
    { label: '🏙️ Beograd', pct: 34, color: '#22c55e' },
    { label: '🏔️ Kopaonik', pct: 22, color: '#3b82f6' },
    { label: '🎵 Novi Sad', pct: 18, color: '#8b5cf6' },
    { label: '💆 Vrnjačka B.', pct: 14, color: '#f59e0b' },
    { label: '🌿 Zlatibor', pct: 8, color: '#ef4444' },
    { label: '📍 Ostalo', pct: 4, color: '#d1d5db' },
  ];

  constructor(public auth: AuthService, private analytics: AnalyticsService) { }

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
      },
      error: () => { this.loading = false; },
    });
  }

  get isSuperAdmin(): boolean { return this.auth.isRole('superadmin'); }
  get pendingCount(): number { return this.pendingRequests.length; }

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
