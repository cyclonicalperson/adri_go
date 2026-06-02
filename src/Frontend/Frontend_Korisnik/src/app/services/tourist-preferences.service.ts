import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export type TravelMode = 'driving' | 'walking' | 'cycling';

export interface TouristAppPreferences {
  locationSharing: boolean;
  anonymousAnalytics: boolean;
  personalizedRecs: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  contentPreferences: string[];
  connectedAccounts: {
    google: boolean;
    apple: boolean;
  };
  bookingServices: string[];
  preferredTravelMode: TravelMode;
}

const DEFAULT_PREFERENCES: TouristAppPreferences = {
  locationSharing: true,
  anonymousAnalytics: false,
  personalizedRecs: true,
  pushNotifications: false,
  emailNotifications: false,
  contentPreferences: [],
  connectedAccounts: {
    google: false,
    apple: false,
  },
  bookingServices: ['booking', 'tripadvisor'],
  preferredTravelMode: 'driving',
};

@Injectable({ providedIn: 'root' })
export class TouristPreferencesService {
  private readonly baseStorageKey = 'adrigo_user_preferences_v2';
  private activeStorageKey = this.baseStorageKey;
  private scopeInitialized = false;
  private readonly stateSubject = new BehaviorSubject<TouristAppPreferences>(this.normalize(DEFAULT_PREFERENCES));

  readonly preferences$ = this.stateSubject.asObservable();

  constructor(private authService: AuthService) {
    this.useAccountScope(this.authService.touristId);
    this.authService.tourist$.subscribe(session => {
      this.useAccountScope(session?.tourist?.id ?? null);
    });
  }

  get snapshot(): TouristAppPreferences {
    return this.stateSubject.value;
  }

  update(patch: Partial<TouristAppPreferences>): TouristAppPreferences {
    const next = this.normalize({
      ...this.snapshot,
      ...patch,
      connectedAccounts: {
        ...this.snapshot.connectedAccounts,
        ...(patch.connectedAccounts ?? {}),
      },
    });

    this.persist(next);
    this.stateSubject.next(next);
    return next;
  }

  useAccountScope(touristId: number | null | undefined): TouristAppPreferences {
    const nextStorageKey = touristId ? `${this.baseStorageKey}:${touristId}` : this.baseStorageKey;
    if (this.scopeInitialized && nextStorageKey === this.activeStorageKey) {
      return this.snapshot;
    }

    this.activeStorageKey = nextStorageKey;
    this.scopeInitialized = true;
    const next = this.loadScopedPreferences(nextStorageKey);
    this.stateSubject.next(next);
    return next;
  }

  setContentPreferences(values: string[]): TouristAppPreferences {
    return this.update({
      contentPreferences: this.uniqueStrings(values),
    });
  }

  toggleConnectedAccount(provider: 'google' | 'apple'): TouristAppPreferences {
    return this.update({
      connectedAccounts: {
        ...this.snapshot.connectedAccounts,
        [provider]: !this.snapshot.connectedAccounts[provider],
      },
    });
  }

  setBookingServices(values: string[]): TouristAppPreferences {
    return this.update({ bookingServices: this.uniqueStrings(values) });
  }

  reset(): TouristAppPreferences {
    const next = this.normalize(DEFAULT_PREFERENCES);
    this.persist(next);
    this.stateSubject.next(next);
    return next;
  }

  private loadScopedPreferences(storageKey: string): TouristAppPreferences {
    const scoped = this.readStoredPreferences(storageKey);
    if (scoped) {
      return scoped;
    }

    const legacy = storageKey !== this.baseStorageKey
      ? this.readStoredPreferences(this.baseStorageKey)
      : null;

    if (legacy) {
      this.persist(legacy);
      return legacy;
    }

    return this.normalize(DEFAULT_PREFERENCES);
  }

  private readStoredPreferences(storageKey: string): TouristAppPreferences | null {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      return this.normalize({
        ...DEFAULT_PREFERENCES,
        ...JSON.parse(raw),
      } as Partial<TouristAppPreferences>);
    } catch {
      return null;
    }
  }

  private persist(state: TouristAppPreferences): void {
    localStorage.setItem(this.activeStorageKey, JSON.stringify(state));
  }

  private normalize(input: Partial<TouristAppPreferences>): TouristAppPreferences {
    const preferredTravelMode = input.preferredTravelMode;

    return {
      locationSharing: input.locationSharing ?? DEFAULT_PREFERENCES.locationSharing,
      anonymousAnalytics: input.anonymousAnalytics ?? DEFAULT_PREFERENCES.anonymousAnalytics,
      personalizedRecs: input.personalizedRecs ?? DEFAULT_PREFERENCES.personalizedRecs,
      pushNotifications: input.pushNotifications ?? DEFAULT_PREFERENCES.pushNotifications,
      emailNotifications: input.emailNotifications ?? DEFAULT_PREFERENCES.emailNotifications,
      contentPreferences: this.uniqueStrings(input.contentPreferences),
      connectedAccounts: {
        google: !!input.connectedAccounts?.google,
        apple: !!input.connectedAccounts?.apple,
      },
      bookingServices: this.uniqueStrings(input.bookingServices ?? DEFAULT_PREFERENCES.bookingServices),
      preferredTravelMode: preferredTravelMode === 'walking' || preferredTravelMode === 'cycling'
        ? preferredTravelMode
        : 'driving',
    };
  }

  private uniqueStrings(values?: string[]): string[] {
    return Array.from(new Set((values ?? [])
      .map(v => (v || '').trim().toLowerCase())
      .filter(Boolean)));
  }
}
