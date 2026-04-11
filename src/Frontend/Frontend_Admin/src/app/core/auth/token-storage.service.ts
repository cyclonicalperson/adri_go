import { Injectable } from '@angular/core';

const TOKEN_KEY = 'tg_access_token';
const USER_KEY = 'tg_user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  saveUser(user: object): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user to localStorage', e);
    }
  }

  getUser(): any | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw || raw === 'null' || raw === 'undefined') {
        return null;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn('🔄 Corrupted user data in localStorage. Clearing to prevent bootstrap crash.', e);
      this.removeUser();
      return null;
    }
  }

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  }

  clear(): void {
    this.removeToken();
    this.removeUser();
  }
}
