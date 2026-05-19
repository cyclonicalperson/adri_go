import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';
  private readonly themeSubject = new BehaviorSubject<AppTheme>(this.loadTheme());
  private initialized = false;

  readonly theme$ = this.themeSubject.asObservable().pipe(distinctUntilChanged());
  readonly isDark$ = this.theme$.pipe(map(theme => theme === 'dark'));

  constructor(@Inject(DOCUMENT) private document: Document) {}

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.applyTheme(this.themeSubject.value);
  }

  get theme(): AppTheme {
    return this.themeSubject.value;
  }

  get isDarkMode(): boolean {
    return this.theme === 'dark';
  }

  toggleTheme(): void {
    this.setTheme(this.isDarkMode ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    if (this.themeSubject.value === theme) {
      this.applyTheme(theme);
      return;
    }

    this.persistTheme(theme);
    this.applyTheme(theme);
    this.themeSubject.next(theme);
  }

  private loadTheme(): AppTheme {
    try {
      return localStorage.getItem(this.storageKey) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  private persistTheme(theme: AppTheme): void {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch {
      // Ignore storage failures and keep the active theme in memory.
    }
  }

  private applyTheme(theme: AppTheme): void {
    const html = this.document.documentElement;

    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      return;
    }

    html.removeAttribute('data-theme');
  }
}
