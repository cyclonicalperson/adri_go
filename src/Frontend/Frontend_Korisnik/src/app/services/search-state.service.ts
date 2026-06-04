import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  private readonly STORAGE_KEY = 'adrigo_search_query';
  private value = '';

  constructor() {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) this.value = stored;
    } catch {}
  }

  get(): string {
    return this.value;
  }

  set(query: string): void {
    this.value = query ?? '';
    try {
      if (this.value) sessionStorage.setItem(this.STORAGE_KEY, this.value);
      else sessionStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }

  clear(): void {
    this.set('');
  }
}
