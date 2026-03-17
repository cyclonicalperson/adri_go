import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';

import { AdminEventListItem } from '../../models/event.model';
import { AdminEventsService } from '../../services/admin-events.service';
import { formatEventDate } from '../../utils/date-format.util';
import { getApiErrorMessage } from '../../utils/http-error.util';

@Component({
  selector: 'app-admin-events-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-events-page.component.html',
  styleUrl: './admin-events-page.component.css'
})
export class AdminEventsPageComponent implements OnInit {
  private readonly adminEventsService = inject(AdminEventsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly loadErrorMessage = signal('');
  readonly actionErrorMessage = signal('');
  readonly events = signal<AdminEventListItem[]>([]);

  ngOnInit(): void {
    this.loadEvents();
  }

  formatDate(value: string): string {
    return formatEventDate(value);
  }

  deleteEvent(event: AdminEventListItem): void {
    const shouldDelete = confirm(`Delete "${event.title}"? This will remove its registrations as well.`);

    if (!shouldDelete) {
      return;
    }

    this.actionErrorMessage.set('');

    this.adminEventsService
      .deleteEvent(event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.events.update((items) => items.filter((item) => item.id !== event.id));
        },
        error: (error) => {
          this.actionErrorMessage.set(getApiErrorMessage(error, 'Unable to delete the selected event.'));
        }
      });
  }

  private loadEvents(): void {
    this.isLoading.set(true);
    this.loadErrorMessage.set('');
    this.actionErrorMessage.set('');
    this.events.set([]);

    this.adminEventsService
      .getEvents()
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
          this.loadErrorMessage.set(getApiErrorMessage(error, 'Unable to load the admin events list.'));
        }
      });
  }
}
