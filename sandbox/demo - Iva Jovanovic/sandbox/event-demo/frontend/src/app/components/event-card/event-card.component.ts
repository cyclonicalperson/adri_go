import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicEventSummary } from '../../models/event.model';
import { formatEventDate } from '../../utils/date-format.util';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.css'
})
export class EventCardComponent {
  @Input({ required: true }) event!: PublicEventSummary;

  formatDate(value: string): string {
    return formatEventDate(value);
  }
}
