import { Injectable } from '@angular/core';
import { PlannerStop } from './route-planner.service';
import { RouteSummary } from './routing.service';
import { TravelMode } from './tourist-preferences.service';

export interface SavedRoute {
  id: string;
  title: string;
  stops: PlannerStop[];
  travelMode: TravelMode;
  scenicMode: boolean;
  savedAt: string;
  distanceKm?: number;
  durationMin?: number;
}

@Injectable({ providedIn: 'root' })
export class SavedRoutesService {
  private readonly storageKey = 'adrigo_saved_routes_v1';
  private readonly maxRoutes = 20;

  getAll(): SavedRoute[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(
    stops: PlannerStop[],
    travelMode: TravelMode,
    scenicMode: boolean,
    title: string,
    summary?: RouteSummary,
  ): SavedRoute {
    const route: SavedRoute = {
      id: `route_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim() || this.generateTitle(stops, travelMode),
      stops: stops.map(s => ({ ...s })),
      travelMode,
      scenicMode,
      savedAt: new Date().toISOString(),
      distanceKm: summary?.distanceKm,
      durationMin: summary?.durationMin,
    };

    const existing = this.getAll().filter(r => r.id !== route.id);
    const updated = [route, ...existing].slice(0, this.maxRoutes);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    return route;
  }

  delete(id: string): void {
    const updated = this.getAll().filter(r => r.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
  }

  getById(id: string): SavedRoute | null {
    return this.getAll().find(r => r.id === id) ?? null;
  }

  private generateTitle(stops: PlannerStop[], mode: TravelMode): string {
    if (stops.length === 0) return 'Saved route';
    if (stops.length === 1) return stops[0].title;
    const modeLabel = mode === 'walking' ? '🚶' : mode === 'cycling' ? '🚴' : '🚗';
    return `${modeLabel} ${stops[0].title} → ${stops[stops.length - 1].title}`;
  }
}
