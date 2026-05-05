import { Injectable } from '@angular/core';
import { PlannerStop } from './route-planner.service';
import { RouteSummary } from './routing.service';
import { TravelMode } from './tourist-preferences.service';
import type { CalendarItem } from './user.service';

export interface LocalCalendarSeed {
  postId: number;
  title: string;
  postType: string;
  address?: string;
  imageUrl?: string | null;
  date?: string;
  scheduledTime?: string;
  notes?: string;
}

export interface SavedTripSnapshot {
  id: string;
  title: string;
  travelMode: TravelMode;
  scenicMode: boolean;
  stops: PlannerStop[];
  routeSummary: RouteSummary;
  createdAt: string;
  tripSignature: string;
}

export interface GuestCalendarSaveResult {
  alreadyAdded: boolean;
  localOnly: true;
  item: CalendarItem | null;
}

export interface GuestTripSaveResult {
  addedCount: number;
  alreadyCount: number;
  savedTrip: SavedTripSnapshot;
  localOnly: true;
}

@Injectable({ providedIn: 'root' })
export class GuestItineraryService {
  private readonly calendarStorageKey = 'adrigo_guest_calendar_v1';
  private readonly tripsStorageKey = 'adrigo_guest_saved_trips_v1';

  getGuestCalendar(): CalendarItem[] {
    return this.loadCalendar()
      .sort((left, right) => {
        const leftDate = new Date(left.date || left.scheduledTime || 0).getTime();
        const rightDate = new Date(right.date || right.scheduledTime || 0).getTime();
        return rightDate - leftDate;
      });
  }

  addLocationToCalendar(seed: LocalCalendarSeed): GuestCalendarSaveResult {
    const items = this.loadCalendar();
    const existing = items.find(item => item.postId === seed.postId);
    if (existing) {
      return {
        alreadyAdded: true,
        localOnly: true,
        item: existing,
      };
    }

    const nextItem: CalendarItem = {
      id: this.buildLocalId(),
      postId: seed.postId,
      title: seed.title,
      postType: seed.postType || 'destination',
      address: seed.address || '',
      date: seed.date || new Date().toISOString(),
      notes: seed.notes || 'Saved locally on this device.',
      scheduledTime: seed.scheduledTime || '',
      imageUrl: seed.imageUrl ?? null,
    };

    items.push(nextItem);
    this.persistCalendar(items);

    return {
      alreadyAdded: false,
      localOnly: true,
      item: nextItem,
    };
  }

  saveTripToCalendar(
    stops: PlannerStop[],
    routeSummary: RouteSummary,
    options: {
      title: string;
      travelMode: TravelMode;
      scenicMode: boolean;
    },
  ): GuestTripSaveResult {
    let addedCount = 0;
    let alreadyCount = 0;

    stops
      .filter(stop => stop.id > 0)
      .forEach(stop => {
        const result = this.addLocationToCalendar({
          postId: stop.id,
          title: stop.title,
          postType: stop.postType,
          address: stop.address || stop.regionName || '',
          notes: `Saved from trip "${options.title}" on this device.`,
        });

        if (result.alreadyAdded) {
          alreadyCount += 1;
        } else {
          addedCount += 1;
        }
      });

    const savedTrip = this.saveTripSnapshot(stops, routeSummary, options);
    return {
      addedCount,
      alreadyCount,
      savedTrip,
      localOnly: true,
    };
  }

  removeCalendarItem(postId: number, calendarItemId?: number): boolean {
    const items = this.loadCalendar();
    const filtered = items.filter(item =>
      calendarItemId != null
        ? item.id !== calendarItemId
        : item.postId !== postId
    );

    if (filtered.length === items.length) {
      return false;
    }

    this.persistCalendar(filtered);
    return true;
  }

  getSavedTrips(): SavedTripSnapshot[] {
    return this.loadTrips()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private saveTripSnapshot(
    stops: PlannerStop[],
    routeSummary: RouteSummary,
    options: {
      title: string;
      travelMode: TravelMode;
      scenicMode: boolean;
    },
  ): SavedTripSnapshot {
    const trips = this.loadTrips();
    const tripSignature = this.buildTripSignature(stops, options.travelMode, options.scenicMode);
    const existing = trips.find(trip => trip.tripSignature === tripSignature);

    if (existing) {
      existing.title = options.title;
      existing.routeSummary = routeSummary;
      existing.createdAt = new Date().toISOString();
      existing.stops = stops.map(stop => ({ ...stop }));
      this.persistTrips(trips);
      return existing;
    }

    const snapshot: SavedTripSnapshot = {
      id: this.buildTripId(),
      title: options.title || `${stops.length}-stop trip`,
      travelMode: options.travelMode,
      scenicMode: options.scenicMode,
      stops: stops.map(stop => ({ ...stop })),
      routeSummary,
      createdAt: new Date().toISOString(),
      tripSignature,
    };

    trips.unshift(snapshot);
    this.persistTrips(trips.slice(0, 12));
    return snapshot;
  }

  private buildTripSignature(stops: PlannerStop[], travelMode: TravelMode, scenicMode: boolean): string {
    return `${travelMode}|${scenicMode ? 'scenic' : 'direct'}|${stops.map(stop => stop.id).join(',')}`;
  }

  private loadCalendar(): CalendarItem[] {
    try {
      const raw = localStorage.getItem(this.calendarStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as CalendarItem[];
      return Array.isArray(parsed)
        ? parsed.filter(item => typeof item?.id === 'number' && typeof item?.postId === 'number')
        : [];
    } catch {
      return [];
    }
  }

  private persistCalendar(items: CalendarItem[]): void {
    localStorage.setItem(this.calendarStorageKey, JSON.stringify(items));
  }

  private loadTrips(): SavedTripSnapshot[] {
    try {
      const raw = localStorage.getItem(this.tripsStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as SavedTripSnapshot[];
      return Array.isArray(parsed)
        ? parsed.filter(item => typeof item?.id === 'string' && Array.isArray(item?.stops))
        : [];
    } catch {
      return [];
    }
  }

  private persistTrips(trips: SavedTripSnapshot[]): void {
    localStorage.setItem(this.tripsStorageKey, JSON.stringify(trips));
  }

  private buildLocalId(): number {
    return -Math.floor(Date.now() + Math.random() * 1000);
  }

  private buildTripId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `trip-${Date.now()}-${Math.round(Math.random() * 100000)}`;
  }
}
