import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface LocationStateChange {
  id: number;
  isLiked?: boolean;
  isSaved?: boolean;
  likeCount?: number;
  saveCount?: number;
}

@Injectable({ providedIn: 'root' })
export class LocationStateService {
  private changes$ = new Subject<LocationStateChange>();
  readonly stateChanged$ = this.changes$.asObservable();

  private likedMap = new Map<number, boolean>();
  private savedMap = new Map<number, boolean>();
  private countsMap = new Map<number, { likeCount?: number; saveCount?: number }>();

  emit(change: LocationStateChange): void {
    if (change.isLiked !== undefined) this.likedMap.set(change.id, change.isLiked);
    if (change.isSaved !== undefined) this.savedMap.set(change.id, change.isSaved);
    if (change.likeCount !== undefined || change.saveCount !== undefined) {
      const prev = this.countsMap.get(change.id) ?? {};
      this.countsMap.set(change.id, { ...prev, likeCount: change.likeCount, saveCount: change.saveCount });
    }
    this.changes$.next(change);
  }

  applyKnownState<T extends { id: number; isLiked?: boolean; isSaved?: boolean; likeCount?: number; saveCount?: number }>(
    locations: T[]
  ): T[] {
    return locations.map(loc => {
      const patch: any = {};
      if (this.likedMap.has(loc.id)) patch.isLiked = this.likedMap.get(loc.id);
      if (this.savedMap.has(loc.id)) patch.isSaved = this.savedMap.get(loc.id);
      const counts = this.countsMap.get(loc.id);
      if (counts?.likeCount !== undefined) patch.likeCount = counts.likeCount;
      if (counts?.saveCount !== undefined) patch.saveCount = counts.saveCount;
      return Object.keys(patch).length ? { ...loc, ...patch } : loc;
    });
  }
}