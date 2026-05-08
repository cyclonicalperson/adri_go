import { Injectable } from '@angular/core';

export interface UserPosition {
  lat: number;
  lng: number;
}

interface StoredUserSettings {
  locationSharing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly SETTINGS_KEY = 'user_settings';

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  isSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
  }

  isLocationSharingEnabled(): boolean {
    try {
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

    return new Promise<UserPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Greška pri dohvatanju lokacije:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
          ...options
        }
      );
    });
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
