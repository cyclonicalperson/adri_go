import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '@env/environment';
import { TokenStorageService } from '@core/auth/token-storage.service';
import { AdminNotification } from '@core/models/user.model';

/**
 * NotificationHubService — real-time notifikacije za admin panel.
 *
 * Koristi SignalR WebSocket vezu na /hubs/notifications.
 * Automatski se konekcija obnovi ako se prekine (reconnect).
 *
 * Primjer upotrebe u komponenti:
 *   private notifHub = inject(NotificationHubService);
 *   this.notifHub.unreadCount$.subscribe(n => this.badge = n);
 *   this.notifHub.notifications$.subscribe(list => this.items = list);
 */
@Injectable({ providedIn: 'root' })
export class NotificationHubService implements OnDestroy {

  private connection: signalR.HubConnection | null = null;
  private readonly apiBase = environment.apiUrl.replace(/\/api$/, '');

  // ── Public streams ────────────────────────────────────────────────────
  readonly notifications$ = new BehaviorSubject<AdminNotification[]>([]);
  readonly unreadCount$ = new BehaviorSubject<number>(0);
  readonly connected$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private ngZone: NgZone,
  ) { }

  // ── Poveži se na hub (poziva se u AppComponent ili layout-u) ─────────
  async connect(): Promise<void> {
    if (this.connection) return;   // već konektovan

    const token = this.tokenStorage.getToken();
    if (!token) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiBase}/hubs/notifications`, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets
          | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // ── Registracija event handlera ───────────────────────────────────
    this.connection.on('NewNotification', (notif: AdminNotification) => {
      this.ngZone.run(() => {
        this.addOrUpdateNotification(notif);
      });
    });

    this.connection.on('UnreadCountUpdated', (count: number) => {
      this.ngZone.run(() => {
        if (count === -1) {
          this.fetchUnreadCount();
        } else {
          this.unreadCount$.next(count);
        }
      });
    });

    this.connection.on('NotificationRead', (id: number) => {
      this.ngZone.run(() => {
        this.setNotificationRead(id);
      });
    });

    this.connection.on('AllNotificationsRead', () => {
      this.ngZone.run(() => {
        this.notifications$.next(this.notifications$.value.map(n => ({ ...n, isRead: true })));
        this.unreadCount$.next(0);
      });
    });

    this.connection.on('NotificationDeleted', (id: number) => {
      this.ngZone.run(() => {
        this.removeNotification(id);
      });
    });

    this.connection.on('NotificationsCleared', () => {
      this.ngZone.run(() => {
        this.notifications$.next([]);
        this.unreadCount$.next(0);
      });
    });

    this.connection.onreconnected(() => {
      this.connected$.next(true);
      this.fetchInitialData();
    });

    this.connection.onclose(() => this.connected$.next(false));

    // ── Start ─────────────────────────────────────────────────────────
    try {
      await this.connection.start();
      this.connected$.next(true);
      this.fetchInitialData();
    } catch (err) {
      console.error('[SignalR] Connection failed:', err);
      this.connected$.next(false);
      this.connection = null;
      this.fetchInitialData();
    }
  }

  // ── Prekini vezu (poziva se pri logout-u) ────────────────────────────
  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this.connected$.next(false);
    this.notifications$.next([]);
    this.unreadCount$.next(0);
  }

  // ── Označi kao pročitano (HTTP + SignalR povratni event) ─────────────
  markAsRead(id: number): Observable<any> {
    return this.http.patch(
      `${environment.apiUrl}/notifications/${id}/read`, {}
    ).pipe(
      tap(() => this.setNotificationRead(id)),
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch(
      `${environment.apiUrl}/notifications/read-all`, {}
    ).pipe(
      tap(() => {
        this.notifications$.next(this.notifications$.value.map(n => ({ ...n, isRead: true })));
        this.unreadCount$.next(0);
      }),
    );
  }

  list(limit = 20): Observable<AdminNotification[]> {
    return this.http.get<{ data: AdminNotification[]; unreadCount?: number }>(
      `${environment.apiUrl}/notifications?limit=${limit}`
    ).pipe(
      map(res => ({
        items: (res.data ?? []).map(normalizeNotification),
        unreadCount: res.unreadCount,
      })),
      tap(({ items, unreadCount }) => {
        this.notifications$.next(items);
        if (typeof unreadCount === 'number' && Number.isFinite(unreadCount)) {
          this.unreadCount$.next(unreadCount);
        }
      }),
      map(({ items }) => items),
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/notifications/${id}`).pipe(
      tap(() => this.removeNotification(id)),
    );
  }

  deleteAll(): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/notifications`).pipe(
      tap(() => {
        this.notifications$.next([]);
        this.unreadCount$.next(0);
      }),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private addOrUpdateNotification(notification: AdminNotification): void {
    const normalized = normalizeNotification(notification);
    const current = this.notifications$.value;
    const existing = current.find(item => item.id === normalized.id);
    const next = [normalized, ...current.filter(item => item.id !== normalized.id)].slice(0, 100);

    this.notifications$.next(next);

    if (!existing && !normalized.isRead) {
      this.unreadCount$.next(this.unreadCount$.value + 1);
    }
  }

  private setNotificationRead(id: number): void {
    const current = this.notifications$.value;
    const existing = current.find(item => item.id === id);
    if (!existing || existing.isRead) {
      return;
    }

    this.notifications$.next(current.map(item =>
      item.id === id ? { ...item, isRead: true } : item
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

  private fetchInitialData(): void {
    this.list(20).subscribe({ error: () => { } });
    this.fetchUnreadCount();
  }

  private fetchUnreadCount(): void {
    this.http.get<{ data: { count: number } }>(
      `${environment.apiUrl}/notifications/unread-count`
    ).subscribe({
      next: res => this.unreadCount$.next(res.data?.count ?? 0),
      error: () => { },
    });
  }

  ngOnDestroy(): void {
    void this.disconnect();
  }
}

function normalizeNotification(notification: any): AdminNotification {
  return {
    id: notification?.id ?? notification?.Id ?? 0,
    adminUserId: notification?.adminUserId ?? notification?.AdminUserId ?? 0,
    type: notification?.type ?? notification?.Type ?? 'system',
    title: notification?.title ?? notification?.Title ?? '',
    body: notification?.body ?? notification?.Body ?? null,
    payload: parseNotificationPayload(notification?.payload ?? notification?.Payload),
    isRead: notification?.isRead ?? notification?.IsRead ?? false,
    createdAt: notification?.createdAt ?? notification?.CreatedAt ?? new Date().toISOString(),
    sentAt: notification?.sentAt ?? notification?.SentAt ?? null,
  };
}

function parseNotificationPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload) return null;
  if (typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  if (typeof payload !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
