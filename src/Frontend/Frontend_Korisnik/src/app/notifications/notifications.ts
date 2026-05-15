import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

interface TouristNotification {
  id: number;
  type: string;
  title: string;
  body?: string;
  payload?: string;
  isRead: boolean;
  createdAt: string;
  sentAt?: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class NotificationsComponent implements OnInit {
  activeFilter: string = 'All';
  isLoading = false;
  notifications: TouristNotification[] = [];

  private readonly apiUrl = `${environment.apiUrl}/tourist-auth`;

  constructor(
    private router: Router,
    private http: HttpClient,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.http.get<{ data: TouristNotification[]; unreadCount: number; success: boolean }>(
      `${this.apiUrl}/notifications?limit=50`
    ).subscribe({
      next: (res) => {
        this.notifications = res.data;
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
      if (filterType === 'alerts')          return t.includes('alert') || t.includes('system') || t.includes('warning') || t.includes('reminder');
      if (filterType === 'recommendations') return t.includes('recommendation') || t.includes('promo') || t.includes('new_event');
      if (filterType === 'messages')        return t.includes('support') || t.includes('message');
      return true;
    });
  }

  goBack(): void {
    window.history.back();
  }

  markAllRead(): void {
    if (!this.authService.isLoggedIn) return;
    this.http.patch(`${this.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.cdr.detectChanges();
      }
    });
  }

  markRead(notif: TouristNotification): void {
    if (notif.isRead || !this.authService.isLoggedIn) return;
    this.http.patch(`${this.apiUrl}/notifications/${notif.id}/read`, {}).subscribe({
      next: () => {
        notif.isRead = true;
        this.cdr.detectChanges();
      }
    });
  }

  deleteNotification(notif: TouristNotification, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn) return;
    this.http.delete(`${this.apiUrl}/notifications/${notif.id}`).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notif.id);
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
    const payload = this.parsePayload(notif.payload);
    const postId = this.readPayloadNumber(payload, 'postId', 'post_id');
    if (postId) {
      return `/location-details/${postId}`;
    }

    const routeId = this.readPayloadNumber(payload, 'routeId', 'route_id');
    if (routeId) {
      return '/routes';
    }

    const url = this.readPayloadString(payload, 'url');
    return url && url.startsWith('/') ? url : null;
  }

  private parsePayload(payload?: string): Record<string, unknown> {
    if (!payload) return {};
    try {
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
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
