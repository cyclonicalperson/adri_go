import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subscription, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { TouristPreferencesService } from './tourist-preferences.service';
import { SiteTranslateService } from './site-translate.service';

export interface TouristNotification {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  payload?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  sentAt?: string | null;
}

export interface TouristNotificationPreference {
  notificationType: string;
  label: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  emailAvailable: boolean;
  canMute: boolean;
}

export interface TouristNotificationPreferenceUpdate {
  notificationType: string;
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TouristNotificationService implements OnDestroy {
  private readonly apiUrl = `${environment.apiUrl}/tourist-auth`;
  private readonly hubUrl = `${environment.apiUrl.replace(/\/api$/, '')}/hubs/tourist-notifications`;
  private connection: signalR.HubConnection | null = null;
  private authSubscription: Subscription;

  readonly notifications$ = new BehaviorSubject<TouristNotification[]>([]);
  readonly unreadCount$ = new BehaviorSubject<number>(0);
  readonly connected$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private preferences: TouristPreferencesService,
    private ngZone: NgZone,
    private translate: SiteTranslateService,
  ) {
    this.authSubscription = this.authService.tourist$.subscribe(session => {
      if (session?.token) {
        void this.connect();
      } else {
        void this.disconnect();
      }
    });
  }

  async connect(): Promise<void> {
    if (this.connection || !this.authService.token) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.authService.token,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('NewNotification', (notification: TouristNotification) => {
      this.ngZone.run(() => {
        const normalized = normalizeNotification(notification);
        const current = this.notifications$.value;
        const existing = current.find(item => item.id === normalized.id);
        const next = [normalized, ...current.filter(item => item.id !== normalized.id)].slice(0, 100);
        this.notifications$.next(next);
        if (!existing && !normalized.isRead) {
          this.unreadCount$.next(this.unreadCount$.value + 1);
        }
        this.showBrowserNotification(normalized);
      });
    });

    this.connection.on('UnreadCountUpdated', (count: number) => {
      this.ngZone.run(() => this.unreadCount$.next(count));
    });

    this.connection.on('NotificationRead', (id: number) => {
      this.ngZone.run(() => {
        this.setNotificationRead(id);
      });
    });

    this.connection.on('AllNotificationsRead', () => {
      this.ngZone.run(() => {
        const next = this.notifications$.value.map(item => ({ ...item, isRead: true }));
        this.notifications$.next(next);
        this.unreadCount$.next(0);
      });
    });

    this.connection.on('NotificationDeleted', (id: number) => {
      this.ngZone.run(() => {
        this.removeNotification(id);
      });
    });

    this.connection.onreconnected(() => {
      this.connected$.next(true);
      this.fetchInitialData();
    });

    this.connection.onclose(() => this.connected$.next(false));

    try {
      await this.connection.start();
      this.connected$.next(true);
      this.fetchInitialData();
    } catch {
      this.connected$.next(false);
      this.connection = null;
      this.fetchInitialData();
    }
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this.connected$.next(false);
    this.notifications$.next([]);
    this.unreadCount$.next(0);
  }

  list(limit = 50): Observable<TouristNotification[]> {
    return this.http
      .get<{ data: TouristNotification[]; unreadCount: number }>(`${this.apiUrl}/notifications?limit=${limit}`)
      .pipe(
        map(res => ({
          items: (res.data ?? []).map(normalizeNotification),
          unreadCount: res.unreadCount,
        })),
        tap(({ items, unreadCount }) => {
          this.notifications$.next(items);
          this.unreadCount$.next(
            typeof unreadCount === 'number' && Number.isFinite(unreadCount)
              ? unreadCount
              : items.filter(item => !item.isRead).length,
          );
        }),
        map(({ items }) => items),
      );
  }

  markRead(id: number): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => this.setNotificationRead(id)),
    );
  }

  markAllRead(): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/notifications/read-all`, {}).pipe(
      tap(() => {
        const next = this.notifications$.value.map(item => ({ ...item, isRead: true }));
        this.notifications$.next(next);
        this.unreadCount$.next(0);
      }),
    );
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/notifications/${id}`).pipe(
      tap(() => this.removeNotification(id)),
    );
  }

  getPreferences(): Observable<TouristNotificationPreference[]> {
    return this.http
      .get<{ data: TouristNotificationPreference[] }>(`${this.apiUrl}/notification-preferences`)
      .pipe(map(res => res.data ?? []));
  }

  updatePreferences(updates: TouristNotificationPreferenceUpdate[]): Observable<TouristNotificationPreference[]> {
    return this.http
      .put<{ data: TouristNotificationPreference[] }>(`${this.apiUrl}/notification-preferences`, updates)
      .pipe(map(res => res.data ?? []));
  }

  private fetchInitialData(): void {
    if (!this.authService.isLoggedIn) {
      return;
    }

    this.list(50).subscribe({ error: () => {} });
  }

  private setNotificationRead(id: number): void {
    const current = this.notifications$.value;
    const existing = current.find(item => item.id === id);
    if (!existing || existing.isRead) {
      return;
    }

    this.notifications$.next(current.map(item =>
      item.id === id ? { ...item, isRead: true } : item,
    ));
    this.unreadCount$.next(Math.max(0, this.unreadCount$.value - 1));
  }

  private removeNotification(id: number): void {
    const current = this.notifications$.value;
    const existing = current.find(item => item.id === id);
    if (!existing) {
      return;
    }

    this.notifications$.next(current.filter(item => item.id !== id));
    if (!existing.isRead) {
      this.unreadCount$.next(Math.max(0, this.unreadCount$.value - 1));
    }
  }

  private showBrowserNotification(notification: TouristNotification): void {
    if (!this.preferences.snapshot.pushNotifications || !('Notification' in window)) {
      return;
    }

    const payload = notification.payload ?? {};
    if (payload['pushEligible'] !== true || Notification.permission !== 'granted') {
      return;
    }

    new Notification(this.translate.instant(notification.title), {
      body: notification.body ? this.translate.instant(notification.body) : undefined,
    });
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    void this.disconnect();
  }
}

function normalizeNotification(notification: any): TouristNotification {
  return {
    id: notification?.id ?? notification?.Id ?? 0,
    type: notification?.type ?? notification?.Type ?? '',
    title: notification?.title ?? notification?.Title ?? '',
    body: notification?.body ?? notification?.Body ?? null,
    payload: parsePayload(notification?.payload ?? notification?.Payload),
    isRead: notification?.isRead ?? notification?.IsRead ?? false,
    createdAt: notification?.createdAt ?? notification?.CreatedAt ?? new Date().toISOString(),
    sentAt: notification?.sentAt ?? notification?.SentAt ?? null,
  };
}

function parsePayload(payload: unknown): Record<string, unknown> | null {
  if (!payload) return null;
  if (typeof payload === 'object') return payload as Record<string, unknown>;
  if (typeof payload !== 'string') return null;

  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
