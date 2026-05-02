import { Injectable } from '@angular/core';
import { TouristPreferencesService } from './tourist-preferences.service';

export interface TouristAnalyticsEvent {
  type: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class TouristAnalyticsService {
  private readonly storageKey = 'adrigo_analytics_events_v1';
  private readonly maxEvents = 120;

  constructor(private preferences: TouristPreferencesService) {}

  track(type: string, metadata?: Record<string, unknown>): void {
    if (!this.preferences.snapshot.anonymousAnalytics || !type.trim()) {
      return;
    }

    const next: TouristAnalyticsEvent = {
      type: type.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      metadata,
    };

    const events = this.readEvents();
    events.unshift(next);
    localStorage.setItem(this.storageKey, JSON.stringify(events.slice(0, this.maxEvents)));
  }

  getRecentEvents(): TouristAnalyticsEvent[] {
    return this.readEvents();
  }

  clearHistory(): void {
    localStorage.removeItem(this.storageKey);
  }

  private readEvents(): TouristAnalyticsEvent[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
