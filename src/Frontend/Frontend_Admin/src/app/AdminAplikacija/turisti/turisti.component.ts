import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AnalyticsService, TouristMovement } from '@core/services/analytics.service';

interface Preference { label: string; pct: number; color: string; }
interface ProfileStat { label: string; value: string; }

@Component({
  selector: 'app-turisti',
  templateUrl: './turisti.component.html',
  styleUrl: './turisti.component.scss',
  imports: [DecimalPipe],
})
export class TuristiComponent implements OnInit {
  movements: TouristMovement[] = [];
  loading = true;
  timeRange: '24h' | '7d' | '30d' = '7d';
  totalTourists = 0;

  readonly preferences: Preference[] = [
    { label: '🏨 Smeštaj', pct: 38, color: '#22c55e' },
    { label: '🎭 Kultura', pct: 24, color: '#3b82f6' },
    { label: '⚽ Sport', pct: 18, color: '#f59e0b' },
    { label: '💆 Wellness', pct: 12, color: '#8b5cf6' },
    { label: '🍴 Hrana', pct: 8, color: '#ef4444' },
  ];

  readonly profileStats: ProfileStat[] = [
    { label: 'Prosečna starost', value: '—' },
    { label: 'Prosek dana u poseti', value: '—' },
    { label: 'Omiljeni tip aktivnosti', value: '⚽ Sport' },
  ];

  constructor(private analytics: AnalyticsService) { }

  ngOnInit(): void {
    this.analytics.getTouristMovements().subscribe({
      next: res => {
        this.movements = res.data;
        this.totalTourists = res.data.reduce((s: number, m: TouristMovement) => s + m.visitCount, 0);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get activeTourists(): number { return this.totalTourists; }
  get currentlyOnsite(): number { return Math.round(this.totalTourists * 0.15); }

  setRange(range: '24h' | '7d' | '30d'): void {
    this.timeRange = range;
    // Re-fetch with range param when API supports it
  }

  get activeRangeLabel(): string {
    return { '24h': 'poslednja 24h', '7d': 'poslednjih 7 dana', '30d': 'poslednjih 30 dana' }[this.timeRange];
  }

  get topMovements(): TouristMovement[] {
    return [...this.movements].sort((a, b) => b.visitCount - a.visitCount).slice(0, 8);
  }

  shareWidth(count: number): number {
    const max = Math.max(...this.movements.map(m => m.visitCount), 1);
    return Math.round((count / max) * 100);
  }

  rankClass(i: number): string {
    return ['gold', 'silver', 'bronze'][i] ?? '';
  }

  // Map pin helpers — simple normalized spread across map area
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

  pinColor(m: TouristMovement): string {
    const top = [...this.movements].sort((a, b) => b.visitCount - a.visitCount);
    const rank = top.findIndex(x => x.regionId === m.regionId);
    return rank === 0 ? '#22c55e' : rank < 3 ? '#f59e0b' : '#3b82f6';
  }
}
