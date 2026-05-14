import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminListStateService {
  private readonly prefix = 'admin-list-state:';

  read<T extends object>(key: string): Partial<T> {
    if (typeof sessionStorage === 'undefined') {
      return {};
    }

    try {
      const raw = sessionStorage.getItem(this.prefix + key);
      return raw ? JSON.parse(raw) as Partial<T> : {};
    } catch {
      return {};
    }
  }

  save<T extends object>(key: string, state: T): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(this.prefix + key, JSON.stringify(state));
  }
}
