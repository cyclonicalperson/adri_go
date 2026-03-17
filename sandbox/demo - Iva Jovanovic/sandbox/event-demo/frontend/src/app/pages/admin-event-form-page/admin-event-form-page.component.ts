import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';

import { SaveEventRequest } from '../../models/event.model';
import { AdminEventsService } from '../../services/admin-events.service';
import { getApiErrorMessage } from '../../utils/http-error.util';

@Component({
  selector: 'app-admin-event-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-event-form-page.component.html',
  styleUrl: './admin-event-form-page.component.css'
})
export class AdminEventFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminEventsService = inject(AdminEventsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly eventForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required]],
    eventDate: ['', [Validators.required]],
    eventTime: ['', [Validators.required]],
    location: ['', [Validators.required, Validators.maxLength(200)]],
    maxParticipants: [20, [Validators.required, Validators.min(1)]],
    isRegistrationOpen: [true]
  });

  readonly isEditMode = signal(false);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly eventId = signal<number | null>(null);
  readonly pageTitle = computed(() => (this.isEditMode() ? 'Edit event' : 'Create a new event'));

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.isEditMode.set(false);
        this.eventId.set(null);
        this.isLoading.set(false);
        this.errorMessage.set('');
        this.eventForm.reset({
          title: '',
          description: '',
          eventDate: '',
          eventTime: '',
          location: '',
          maxParticipants: 20,
          isRegistrationOpen: true
        });
        return;
      }

      this.isEditMode.set(true);
      this.eventId.set(Number(id));
      this.loadEvent(Number(id));
    });
  }

  submit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const request = this.eventForm.getRawValue() as SaveEventRequest;
    const eventId = this.eventId();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request$ = this.isEditMode() && eventId
      ? this.adminEventsService.updateEvent(eventId, request)
      : this.adminEventsService.createEvent(request);

    request$
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/admin/events']);
        },
        error: (error) => {
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to save the event.'));
        }
      });
  }

  private loadEvent(id: number): void {
    if (!Number.isFinite(id)) {
      this.errorMessage.set('The selected event was not found.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.adminEventsService
      .getEventById(id)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (event) => {
          this.eventForm.patchValue({
            title: event.title,
            description: event.description,
            eventDate: event.eventDate,
            eventTime: event.eventTime,
            location: event.location,
            maxParticipants: event.maxParticipants,
            isRegistrationOpen: event.isRegistrationOpen
          });
        },
        error: (error) => {
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load the selected event.'));
        }
      });
  }
}
