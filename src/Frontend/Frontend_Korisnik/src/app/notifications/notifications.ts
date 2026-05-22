import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TouristNotification, TouristNotificationService } from '../services/tourist-notification.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  activeFilter: string = 'All';
  isLoading = false;
  notifications: TouristNotification[] = [];
  unreadCount = 0;
  connected = false;
  readonly filters = ['All', 'Alerts', 'Reviews', 'Recommendations', 'Trips', 'Messages'];

  private readonly subscriptions = new Subscription();

  constructor(
    private router: Router,
    public authService: AuthService,
    private notificationService: TouristNotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn) {
      this.subscriptions.add(this.notificationService.notifications$.subscribe(items => {
        this.notifications = items;
        this.cdr.detectChanges();
      }));
      this.subscriptions.add(this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
        this.cdr.detectChanges();
      }));
      this.subscriptions.add(this.notificationService.connected$.subscribe(connected => {
        this.connected = connected;
        this.cdr.detectChanges();
      }));
      this.loadNotifications();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.list(50).subscribe({
      next: (items) => {
        this.notifications = items;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredNotifications(): TouristNotification[] {
    if (this.activeFilter === 'All') return this.notifications;
    const filterType = this.activeFilter.toLowerCase();
    return this.notifications.filter(n => {
      const t = (n.type || '').toLowerCase();
      if (filterType === 'alerts')          return t.includes('alert') || t.includes('system') || t.includes('warning') || t.includes('important');
      if (filterType === 'reviews')         return t.includes('review');
      if (filterType === 'recommendations') return t.includes('recommendation') || t.includes('promo') || t.includes('new_event');
      if (filterType === 'trips')           return t.includes('calendar') || t.includes('trip') || t.includes('booking') || t.includes('reminder');
      if (filterType === 'messages')        return t.includes('support') || t.includes('message');
      return true;
    });
  }

  goBack(): void {
    window.history.back();
  }

  markAllRead(): void {
    if (!this.authService.isLoggedIn) return;
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.cdr.detectChanges();
      }
    });
  }

  markRead(notif: TouristNotification): void {
    if (notif.isRead || !this.authService.isLoggedIn) return;
    this.notificationService.markRead(notif.id).subscribe({
      next: () => {
        this.cdr.detectChanges();
      }
    });
  }

  deleteNotification(notif: TouristNotification, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn) return;
    this.notificationService.delete(notif.id).subscribe({
      next: () => {
        this.cdr.detectChanges();
      }
    });
  }

  openNotification(notif: TouristNotification): void {
    this.markRead(notif);
    const target = this.getNotificationTarget(notif);
    if (target) {
      this.router.navigateByUrl(target);
    }
  }

  getNotificationIcon(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('review')) return t.includes('rejected') ? '\u2715' : '\u2713';
    if (t.includes('alert') || t.includes('warning') || t.includes('important')) return '\u26A0';
    if (t.includes('recommendation') || t.includes('promo')) return '\u2728';
    if (t.includes('support') || t.includes('message')) return '\u{1F4AC}';
    if (t.includes('calendar') || t.includes('trip') || t.includes('booking') || t.includes('reminder')) return '\u{1F4C5}';
    if (t.includes('event')) return '\u{1F4CD}';
    return '\u{1F514}';
  }

  getIcon(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('review')) return t.includes('rejected') ? 'X' : 'OK';
    if (t.includes('alert') || t.includes('warning')) return '⚠️';
    if (t.includes('recommendation') || t.includes('promo')) return '✨';
    if (t.includes('support') || t.includes('message')) return '💬';
    if (t.includes('booking') || t.includes('reminder')) return '🛡️';
    if (t.includes('event')) return '📅';
    return '🔔';
  }

  getTypeClass(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('review')) return t.includes('rejected') ? 'alert' : 'recommendation';
    if (t.includes('alert') || t.includes('warning')) return 'alert';
    if (t.includes('recommendation') || t.includes('promo')) return 'recommendation';
    if (t.includes('support') || t.includes('message')) return 'support';
    if (t.includes('calendar') || t.includes('trip')) return 'booking';
    return 'booking';
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now  = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin  = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay  = Math.floor(diffMs / 86400000);
    if (diffMin < 1)    return 'Just now';
    if (diffMin < 60)   return `${diffMin}M AGO`;
    if (diffHour < 24)  return `${diffHour}H AGO`;
    if (diffDay < 7)    return `${diffDay}D AGO`;
    return date.toLocaleDateString();
  }

  private getNotificationTarget(notif: TouristNotification): string | null {
    const payload = notif.payload ?? {};
    const url = this.readPayloadString(payload, 'url');
    const type = (notif.type || '').toLowerCase();

    if ((type.includes('calendar') || type.includes('trip')) && url?.startsWith('/')) {
      return url;
    }

    const postId = this.readPayloadNumber(payload, 'postId', 'post_id');
    if (postId) {
      return `/location-details/${postId}`;
    }

    const routeId = this.readPayloadNumber(payload, 'routeId', 'route_id');
    if (routeId) {
      return '/routes';
    }

    return url && url.startsWith('/') ? url : null;
  }

  private readPayloadNumber(payload: Record<string, unknown>, ...keys: string[]): number | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
    }
    return null;
  }

  private readPayloadString(payload: Record<string, unknown>, key: string): string | null {
    const value = payload[key];
    return typeof value === 'string' && value.trim() ? value : null;
  }
}
