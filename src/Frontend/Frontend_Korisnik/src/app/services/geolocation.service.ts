import { Injectable } from '@angular/core';

export interface UserPosition {
  lat: number;
  lng: number;
}

interface StoredUserSettings {
  locationSharing?: boolean;
}

interface StoredTouristPreferences {
  locationSharing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly SETTINGS_KEY = 'user_settings';
  private readonly PREFERENCES_KEY = 'adrigo_user_preferences_v2';

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  isSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
  }

  isLocationSharingEnabled(): boolean {
    try {
      const preferencesRaw = localStorage.getItem(this.PREFERENCES_KEY);
      if (preferencesRaw) {
        const preferences = JSON.parse(preferencesRaw) as StoredTouristPreferences;
        if (typeof preferences.locationSharing === 'boolean') {
          return preferences.locationSharing;
        }
      }

      const raw = localStorage.getItem(this.SETTINGS_KEY);
      if (!raw) return true;

      const settings = JSON.parse(raw) as StoredUserSettings;
      return settings.locationSharing ?? true;
    } catch {
      return true;
    }
  }

  async requestCurrentPosition(options?: PositionOptions): Promise<UserPosition | null> {
    if (!this.isSupported()) {
      console.warn('Geolocation nije podržan u ovom browseru.');
      return null;
    }

    if (!this.isSecureContext()) {
      console.warn('Geolocation zahteva HTTPS. Lokacija nije dostupna na HTTP.');
      return null;
    }

    if (!this.isLocationSharingEnabled()) {
      return null;
    }

    // Try network-based first (fast, works on desktop Firefox/Chrome without GPS).
    // If the caller explicitly overrides options, honour them.
    const defaults: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 30000,
    };
    const merged: PositionOptions = { ...defaults, ...options };

    const tryGet = (opts: PositionOptions) =>
      new Promise<UserPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          opts,
        );
      });

    const result = await tryGet(merged);
    if (result) return result;

    // If the first attempt timed out / failed and we were already using low-accuracy,
    // do a final retry with a shorter timeout (IP-only, always fast).
    return tryGet({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
  }

  haversineKm(from: UserPosition, to: UserPosition): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);
    const lat1 = this.toRadians(from.lat);
    const lat2 = this.toRadians(to.lat);

    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(distance * 10) / 10;
  }

  formatDistanceKm(distanceKm: number | null | undefined): string {
    if (distanceKm == null) return '';
    return `${distanceKm.toFixed(1)} km`;
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
  }
}
