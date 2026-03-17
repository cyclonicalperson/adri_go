import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';

import { EventDetails } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { formatEventDate } from '../../utils/date-format.util';
import { getApiErrorMessage } from '../../utils/http-error.util';

@Component({
  selector: 'app-event-details-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './event-details-page.component.html',
  styleUrl: './event-details-page.component.css'
})
export class EventDetailsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventsService = inject(EventsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly registrationForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]]
  });

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly pageErrorMessage = signal('');
  readonly registrationErrorMessage = signal('');
  readonly successMessage = signal('');
  readonly event = signal<EventDetails | null>(null);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.loadEvent(id);
    });
  }

  get registrationDisabled(): boolean {
    const event = this.event();
    return this.isSubmitting() || !event || event.isFull || !event.isRegistrationOpen;
  }

  formatDate(value: string): string {
    return formatEventDate(value);
  }

  submitRegistration(): void {
    if (!this.event() || this.registrationDisabled) {
      return;
    }

    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      this.registrationErrorMessage.set('Enter a valid full name and email before registering.');
      return;
    }

    const event = this.event();
    if (!event) {
      return;
    }

    this.isSubmitting.set(true);
    this.registrationErrorMessage.set('');
    this.successMessage.set('');

    this.eventsService
      .registerForEvent(event.id, this.registrationForm.getRawValue())
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          this.successMessage.set(`${response.message} Registered at ${response.registrationDate}.`);
          this.registrationErrorMessage.set('');
          this.registrationForm.reset();
          this.loadEvent(event.id, false, true);
        },
        error: (error) => {
          this.registrationErrorMessage.set(getApiErrorMessage(error, 'Registration could not be completed.'));
        }
      });
  }

  private loadEvent(id: number, showLoader = true, preserveCurrentEventOnError = false): void {
    if (!Number.isFinite(id)) {
      this.event.set(null);
      this.pageErrorMessage.set('The selected event was not found.');
      this.registrationErrorMessage.set('');
      this.isLoading.set(false);
      return;
    }

    if (showLoader) {
      this.isLoading.set(true);
      this.event.set(null);
      this.pageErrorMessage.set('');
      this.registrationErrorMessage.set('');
      this.successMessage.set('');
    }

    this.eventsService
      .getEventById(id)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (showLoader) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (event) => {
          if (!event) {
            this.event.set(null);
            this.pageErrorMessage.set('The selected event could not be loaded.');
            return;
          }

          this.event.set(event);
          this.pageErrorMessage.set('');
          this.registrationErrorMessage.set('');
        },
        error: (error) => {
          const message = getApiErrorMessage(error, 'The selected event could not be loaded.');

          if (!showLoader && preserveCurrentEventOnError && this.event()) {
            this.registrationErrorMessage.set('Registration succeeded, but the event details could not be refreshed.');
            return;
          }

          this.event.set(null);
          this.pageErrorMessage.set(message);
        }
      });
  }
}
