import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import {
  AnalyticsService,
  DailyVisit,
  PopularPost,
  TouristMovement,
} from '@core/services/analytics.service';
import { TouristMovementsComponent } from './components/tourist-movements/tourist-movements.component';

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrl: './analytics-dashboard.component.scss',
  imports: [TouristMovementsComponent, DecimalPipe],
})
export class AnalyticsDashboardComponent implements OnInit {
  visits: DailyVisit[] = [];
  popularObjects: PopularPost[] = [];
  popularEvents: PopularPost[] = [];
  movements: TouristMovement[] = [];
  loading = true;

  constructor(private analytics: AnalyticsService) { }

  ngOnInit(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    forkJoin({
      visits: this.analytics.getDailyVisits(fmt(from), fmt(today)),
      objects: this.analytics.getPopularPosts(5),
      events: this.analytics.getPopularEvents(5),
      movements: this.analytics.getTouristMovements(),
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
}
