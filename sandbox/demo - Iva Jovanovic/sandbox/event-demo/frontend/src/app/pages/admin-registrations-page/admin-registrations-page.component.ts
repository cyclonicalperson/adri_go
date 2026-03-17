import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, take } from 'rxjs';

import { AdminEventDetails } from '../../models/event.model';
import { RegistrationItem } from '../../models/registration.model';
import { AdminEventsService } from '../../services/admin-events.service';
import { formatEventDate, formatRegistrationDate } from '../../utils/date-format.util';
import { getApiErrorMessage } from '../../utils/http-error.util';

@Component({
  selector: 'app-admin-registrations-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-registrations-page.component.html',
  styleUrl: './admin-registrations-page.component.css'
})
export class AdminRegistrationsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminEventsService = inject(AdminEventsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionErrorMessage = signal('');
  readonly event = signal<AdminEventDetails | null>(null);
  readonly registrations = signal<RegistrationItem[]>([]);
  readonly deletingRegistrationId = signal<number | null>(null);
  readonly hasRegistrations = computed(() => this.registrations().length > 0);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.loadRegistrations(id);
    });
  }

  formatDate(value: string): string {
    return formatEventDate(value);
  }

  formatRegistration(value: string): string {
    return formatRegistrationDate(value);
  }

  deleteRegistration(registration: RegistrationItem): void {
    const event = this.event();
    if (!event || this.deletingRegistrationId()) {
      return;
    }

    const shouldDelete = confirm(`Delete registration for "${registration.fullName}"?`);
    if (!shouldDelete) {
      return;
    }

    this.deletingRegistrationId.set(registration.id);
    this.actionErrorMessage.set('');

    this.adminEventsService
      .deleteRegistration(event.id, registration.id)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.deletingRegistrationId.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.registrations.update((items) => items.filter((item) => item.id !== registration.id));
          this.event.update((currentEvent) =>
            currentEvent
              ? {
                  ...currentEvent,
                  registeredCount: Math.max(currentEvent.registeredCount - 1, 0)
                }
              : currentEvent
          );
        },
        error: (error) => {
          this.actionErrorMessage.set(getApiErrorMessage(error, 'Unable to delete this registration.'));
        }
      });
  }

  private loadRegistrations(id: number): void {
    if (!Number.isFinite(id)) {
      this.event.set(null);
      this.registrations.set([]);
      this.errorMessage.set('The selected event was not found.');
      this.actionErrorMessage.set('');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.actionErrorMessage.set('');
    this.event.set(null);
    this.registrations.set([]);

    forkJoin({
      event: this.adminEventsService.getEventById(id),
      registrations: this.adminEventsService.getRegistrations(id)
    })
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: ({ event, registrations }) => {
          this.event.set(event);
          this.registrations.set(registrations ?? []);
        },
        error: (error) => {
          this.event.set(null);
          this.registrations.set([]);
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load registrations for this event.'));
        }
      });
  }
}
