import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AnalyticsService,
  DailyVisit,
  PopularPost,
  TouristMovement,
} from '@core/services/analytics.service';
import { TouristMovementsComponent } from './components/tourist-movements/tourist-movements.component';
import { PreferencesChartComponent } from './components/preferences-chart/preferences-chart.component';

// Mapa post_type → čitljiva kategorija za grafikon
const POST_TYPE_LABEL: Record<string, string> = {
  accommodation: '🏨 Smeštaj',
  restaurant: '🍽️ Restorani',
  club: '🎵 Klubovi',
  cultural_site: '🏛️ Kulturna mesta',
  monument: '🗿 Spomenici',
  sports_facility: '⚽ Sportski objekti',
  attraction: '🌿 Priroda i atrakcije',
  shop: '🛍️ Prodavnice',
  other: '📍 Ostalo',
};

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrl: './analytics-dashboard.component.scss',
  imports: [TouristMovementsComponent, PreferencesChartComponent, DecimalPipe],
})
export class AnalyticsDashboardComponent implements OnInit {
  visits: DailyVisit[] = [];
  popularObjects: PopularPost[] = [];
  popularEvents: PopularPost[] = [];
  movements: TouristMovement[] = [];
  loading = true;

  /** Objekti s ispravnom `category` labelom za PreferencesChart */
  get popularObjectsWithCategory(): any[] {
    return this.popularObjects.map(o => ({
      ...o,
      category: POST_TYPE_LABEL[o.postType] ?? o.postType,
    }));
  }

  constructor(private analytics: AnalyticsService) { }

  ngOnInit(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    forkJoin({
      visits: this.analytics.getDailyVisits(fmt(from), fmt(today))
        .pipe(catchError(() => of({ data: [] as DailyVisit[] }))),
      objects: this.analytics.getPopularPosts(5)
        .pipe(catchError(() => of({ data: [] as PopularPost[] }))),
      events: this.analytics.getPopularEvents(5)
        .pipe(catchError(() => of({ data: [] as PopularPost[] }))),
      movements: this.analytics.getTouristMovements()
        .pipe(catchError(() => of({ data: [] as TouristMovement[] }))),
    }).subscribe({
      next: res => {
        this.visits = res.visits.data;
        this.popularObjects = res.objects.data;
        this.popularEvents = res.events.data;
        this.movements = res.movements.data;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  barHeight(count: number): number {
    if (!this.visits.length) return 0;
    const max = Math.max(...this.visits.map(v => v.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  barColor(i: number): string {
    return ['bar-green', 'bar-blue', 'bar-amber'][i % 3];
  }

  topBarWidth(val: number, list: PopularPost[]): number {
    const max = Math.max(...list.map(e => e.viewCount), 1);
    return Math.round((val / max) * 100);
  }

  get totalViews(): number {
    const objViews = this.popularObjects.reduce((s, p) => s + p.viewCount, 0);
    const evViews = this.popularEvents.reduce((s, p) => s + p.viewCount, 0);
    return objViews + evViews;
  }

  get totalDailyViews(): number {
    return this.visits.reduce((s, v) => s + v.count, 0);
  }

  get avgRating(): string {
    const rated = [...this.popularObjects, ...this.popularEvents].filter(p => p.avgRating != null);
    if (!rated.length) return '—';
    const avg = rated.reduce((s, p) => s + (p.avgRating ?? 0), 0) / rated.length;
    return avg.toFixed(1);
  }
}
