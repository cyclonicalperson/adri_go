import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';

import { EventCardComponent } from '../../components/event-card/event-card.component';
import { PublicEventSummary } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { isUpcomingEvent } from '../../utils/date-format.util';
import { getApiErrorMessage } from '../../utils/http-error.util';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EventCardComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly featuredEvents = signal<PublicEventSummary[]>([]);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.featuredEvents.set([]);

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
          const featuredEvents = Array.isArray(events)
            ? events.filter((event) => isUpcomingEvent(event.eventDate)).slice(0, 3)
            : [];

          this.featuredEvents.set(featuredEvents);
        },
        error: (error) => {
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load upcoming events right now.'));
        }
      });
  }
}
