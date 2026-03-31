import { Component, Input } from '@angular/core';
import { DashboardStats } from '@core/services/analytics.service';

interface StatCard {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss',
})

export class StatsCardsComponent {
  @Input({ required: true }) stats!: DashboardStats;

  get cards(): StatCard[] {
    return [
      { label: 'Destinacije', value: this.stats.totalDestinations, color: '#3FA26E' },
      { label: 'Objekti', value: this.stats.totalObjects, color: '#1A73E8' },
      { label: 'Dogadjaji', value: this.stats.totalEvents, color: '#F59E0B' },
      { label: 'Rute', value: this.stats.totalRoutes, color: '#8B5CF6' },
      { label: 'Korisnici', value: this.stats.totalUsers, color: '#EC4899' },
      { label: 'Recenzije (čeka)', value: this.stats.pendingReviews, color: '#E24B4A' },
    ];
  }
}
