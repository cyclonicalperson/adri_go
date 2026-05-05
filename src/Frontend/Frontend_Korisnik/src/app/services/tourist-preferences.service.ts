import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  paymentMethods: string[];
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
  paymentMethods: ['card'],
  preferredTravelMode: 'driving',
};

@Injectable({ providedIn: 'root' })
export class TouristPreferencesService {
  private readonly storageKey = 'adrigo_user_preferences_v2';
  private readonly stateSubject = new BehaviorSubject<TouristAppPreferences>(this.load());

  readonly preferences$ = this.stateSubject.asObservable();

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

  setPaymentMethods(values: string[]): TouristAppPreferences {
    return this.update({ paymentMethods: this.uniqueStrings(values) });
  }

  reset(): TouristAppPreferences {
    const next = this.normalize(DEFAULT_PREFERENCES);
    this.persist(next);
    this.stateSubject.next(next);
    return next;
  }

  private load(): TouristAppPreferences {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return this.normalize(DEFAULT_PREFERENCES);
      }

      return this.normalize({
        ...DEFAULT_PREFERENCES,
        ...JSON.parse(raw),
      } as Partial<TouristAppPreferences>);
    } catch {
      return this.normalize(DEFAULT_PREFERENCES);
    }
  }

  private persist(state: TouristAppPreferences): void {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
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
      paymentMethods: this.uniqueStrings(input.paymentMethods ?? DEFAULT_PREFERENCES.paymentMethods),
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
