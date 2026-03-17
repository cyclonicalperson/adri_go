import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';

import { EventCardComponent } from '../../components/event-card/event-card.component';
import { PublicEventSummary } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { getApiErrorMessage } from '../../utils/http-error.util';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, EventCardComponent],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css'
})
export class EventsPageComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly events = signal<PublicEventSummary[]>([]);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.events.set([]);

    this.eventsService
      .getPublicEvents()
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (events) => {
          this.events.set(Array.isArray(events) ? events : []);
        },
        error: (error) => {
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load the events list.'));
        }
      });
  }
}
