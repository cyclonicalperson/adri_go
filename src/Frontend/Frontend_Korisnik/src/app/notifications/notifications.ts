import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class NotificationsComponent {
  activeFilter: string = 'All';

  notifications = [
    {
      type: 'booking',
      title: 'Booking Confirmed!',
      time: '2M AGO',
      text: 'Your tour of the Adriatic Coast is confirmed for tomorrow at 10:00 AM. Don\'t forget your digital ticket.',
      isNew: true,
      icon: '🛡️'
    },
    {
      type: 'recommendation',
      title: 'New Hidden Gem Nearby',
      time: '45M AGO',
      text: 'Based on your interest in "Nature", we recommend checking out the Blue Cave Grotto, just 5km away.',
      isNew: true,
      icon: '✨'
    },
    {
      type: 'support',
      title: 'Support Response',
      time: '3H AGO',
      text: 'Hello! Your inquiry regarding the refund for the cancelled ferry has been processed successfully.',
      isNew: false,
      icon: '💬'
    },
    {
      type: 'alert',
      title: 'Weather Warning',
      time: '5H AGO',
      text: 'Strong winds expected this evening. Some ferry services may be delayed. Check your schedule.',
      isNew: false,
      icon: '⚠️'
    }
  ];

  constructor(private router: Router) {}

  goBack() {
    window.history.back();
  }

  markAllRead() {
    this.notifications.forEach(n => n.isNew = false);
  }
}