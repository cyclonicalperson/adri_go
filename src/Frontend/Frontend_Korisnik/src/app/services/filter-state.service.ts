import { Injectable } from '@angular/core';

export type FilterContentType = 'destinations' | 'activities' | 'routes';

export interface FilterState {
  minRating: number;
  openNow: boolean;
  radius: number;
  activeCategories: string[];
  destinationCountries?: string[];
  destinationRegions?: string[];
  showOnlySaved?: boolean;
  activityCategories?: string[];
  activityDifficulties?: string[];
  activityLinkedOnly?: boolean;
  routeDifficulties?: string[];
  routeCountries?: string[];
  routeRegions?: string[];
  routeDistanceBand?: string;
  routeDurationBand?: string;
  eventFromDate?: string;
  eventToDate?: string;
  savedPostIds?: number[];
  activeContentType?: FilterContentType;
}

@Injectable({ providedIn: 'root' })
export class FilterStateService {

  private readonly STORAGE_KEY = 'adrigo_filter_state';

  getDefault(): FilterState {
    return {
      minRating: 0,
      openNow: false,
      radius: 0,
      activeCategories: [],
      destinationCountries: [],
      destinationRegions: [],
      showOnlySaved: false,
      savedPostIds: [],
      activityCategories: [],
      activityDifficulties: [],
      activityLinkedOnly: false,
      routeDifficulties: [],
      routeCountries: [],
      routeRegions: [],
      routeDistanceBand: '',
      routeDurationBand: '',
      eventFromDate: '',
      eventToDate: '',
      activeContentType: 'destinations',
    };
  }

  get(): FilterState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? { ...this.getDefault(), ...JSON.parse(stored) } : this.getDefault();
    } catch { return this.getDefault(); }
  }

  set(state: FilterState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /** Returns true if any non-default filter is active */
  isActive(): boolean {
    const s = this.get();
    return s.minRating > 0
      || s.openNow
      || s.radius > 0
      || s.activeCategories.length > 0
      || (s.destinationCountries?.length ?? 0) > 0
      || (s.destinationRegions?.length ?? 0) > 0
      || !!s.showOnlySaved
      || (s.activityCategories?.length ?? 0) > 0
      || (s.activityDifficulties?.length ?? 0) > 0
      || !!s.activityLinkedOnly
      || (s.routeDifficulties?.length ?? 0) > 0
      || (s.routeCountries?.length ?? 0) > 0
      || (s.routeRegions?.length ?? 0) > 0
      || !!s.routeDistanceBand
      || !!s.routeDurationBand
      || !!s.eventFromDate
      || !!s.eventToDate;
  }
}
