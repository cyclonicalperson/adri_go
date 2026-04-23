import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { TokenStorageService } from '@core/auth/token-storage.service';

export interface AdminNotification {
  id: number;
  adminUserId: number;
  type: string;
  title: string;
  body: string;
  payload?: string | null;
  isRead: boolean;
  createdAt: string;
  sentAt?: string | null;
}

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
    private auth: AuthService,
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
        const current = this.notifications$.value;
        this.notifications$.next([notif, ...current].slice(0, 100));
        this.unreadCount$.next(this.unreadCount$.value + 1);
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
        const updated = this.notifications$.value.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        );
        this.notifications$.next(updated);
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
    }
  }

  // ── Prekini vezu (poziva se pri logout-u) ────────────────────────────
  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this.connected$.next(false);
  }

  // ── Označi kao pročitano (HTTP + SignalR povratni event) ─────────────
  markAsRead(id: number): Observable<any> {
    return this.http.patch(
      `${environment.apiUrl}/notifications/${id}/read`, {}
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch(
      `${environment.apiUrl}/notifications/read-all`, {}
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private fetchInitialData(): void {
    // Dohvati zadnjih 20 notifikacija iz baze
    this.http.get<{ data: AdminNotification[] }>(
      `${environment.apiUrl}/notifications?limit=20`
    ).subscribe({
      next: res => this.notifications$.next(res.data ?? []),
      error: () => { },
    });

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
    this.connection?.stop();
  }
}
