import { Injectable } from '@angular/core';

export interface FilterState {
  minRating: number;
  openNow: boolean;
  radius: number;
  activeCategories: string[]; // DB keys; empty = all active
  showOnlySaved?: boolean;    // show only saved post IDs
  savedPostIds?: number[];    // IDs of saved posts (populated by Saved → Show on Map)
}

@Injectable({ providedIn: 'root' })
export class FilterStateService {

  private readonly STORAGE_KEY = 'adrigo_filter_state';

  getDefault(): FilterState {
    return { minRating: 0, openNow: false, radius: 0, activeCategories: [], showOnlySaved: false, savedPostIds: [] };
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
    return s.minRating > 0 || s.openNow || s.activeCategories.length > 0 || !!s.showOnlySaved;
  }
}
