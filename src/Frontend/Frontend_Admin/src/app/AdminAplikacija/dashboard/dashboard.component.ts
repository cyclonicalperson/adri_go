import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AnalyticsService, DashboardStats, DailyVisit } from '@core/services/analytics.service';
import { ReviewService } from '@core/services/review.service';

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

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [RouterLink],
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  visits: DailyVisit[] = [];
  loading = true;

  // Pending requests fed from API eventually — static placeholders for now
  pendingRequests: PendingRequest[] = [
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

  get pendingCount(): number {
    return this.pendingRequests.length;
  }

  constructor(
    private analytics: AnalyticsService,
    private reviewService: ReviewService,
  ) { }

  ngOnInit(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    forkJoin({
      stats: this.analytics.getDashboardStats(),
      visits: this.analytics.getDailyVisits(fmt(from), fmt(today)),
    }).subscribe({
      next: ({ stats, visits }) => {
        this.stats = stats.data;
        this.visits = visits.data;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  /** Height percentage for bar chart bars, capped 8–100 */
  barHeight(count: number): number {
    if (!this.visits.length) return 0;
    const max = Math.max(...this.visits.map(v => v.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  /** Cycle through bar color classes */
  barColor(index: number): string {
    const colors = ['bar-primary', 'bar-blue', 'bar-primary', 'bar-amber'];
    return colors[index % colors.length];
  }
}
