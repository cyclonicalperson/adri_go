import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardStats } from '@core/services/analytics.service';

interface StatCard {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss',
})
export class StatsCardsComponent {
  @Input({ required: true }) stats!: DashboardStats;

  get cards(): StatCard[] {
    return [
      { label: 'Objave', value: this.stats.totalPosts, color: '#3FA26E' },
      { label: 'Rute', value: this.stats.totalRoutes, color: '#1A73E8' },
      { label: 'Turisti', value: this.stats.totalTourists, color: '#F59E0B' },
      { label: 'Admini', value: this.stats.totalAdmins, color: '#8B5CF6' },
      { label: 'Zahtevi', value: this.stats.pendingRegistrations, color: '#EC4899' },
      { label: 'Recenzije (čeka)', value: this.stats.pendingReviews, color: '#E24B4A' },
    ];
  }
}
