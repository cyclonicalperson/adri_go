import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TouristNotificationService } from '../services/tourist-notification.service';

@Component({
  selector: 'app-notification-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="notification-badge" *ngIf="notifications.unreadCount$ | async as count">
      {{ count > 99 ? '99+' : count }}
    </span>
  `,
  styles: [`
    :host {
      position: absolute;
      top: -3px;
      right: -3px;
      pointer-events: none;
    }

    .notification-badge {
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      border: 2px solid #fff;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.28);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      box-sizing: border-box;
    }
  `],
})
export class NotificationBadgeComponent {
  constructor(public notifications: TouristNotificationService) {}
}
