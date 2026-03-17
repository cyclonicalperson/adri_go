import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';

import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { AdminEventListItem } from '../../models/event.model';
import { AdminEventsService } from '../../services/admin-events.service';
import { isUpcomingEvent } from '../../utils/date-format.util';
import { getApiErrorMessage } from '../../utils/http-error.util';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.css'
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly adminEventsService = inject(AdminEventsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly events = signal<AdminEventListItem[]>([]);
  readonly totalRegistrations = computed(() =>
    this.events().reduce((sum, event) => sum + event.registeredCount, 0)
  );
  readonly upcomingEvents = computed(() =>
    this.events().filter((event) => isUpcomingEvent(event.eventDate)).length
  );

  ngOnInit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
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
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load dashboard statistics.'));
        }
      });
  }
}
