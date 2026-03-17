import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AdminEventDetails, AdminEventListItem, SaveEventRequest } from '../models/event.model';
import { RegistrationItem } from '../models/registration.model';

@Injectable({ providedIn: 'root' })
export class AdminEventsService {
  constructor(private readonly http: HttpClient) {}

  getEvents(): Observable<AdminEventListItem[]> {
    return this.http.get<AdminEventListItem[]>(`${environment.apiBaseUrl}/admin/events`);
  }

  getEventById(id: number): Observable<AdminEventDetails> {
    return this.http.get<AdminEventDetails>(`${environment.apiBaseUrl}/admin/events/${id}`);
  }

  createEvent(request: SaveEventRequest): Observable<AdminEventDetails> {
    return this.http.post<AdminEventDetails>(`${environment.apiBaseUrl}/admin/events`, request);
  }

  updateEvent(id: number, request: SaveEventRequest): Observable<AdminEventDetails> {
    return this.http.put<AdminEventDetails>(`${environment.apiBaseUrl}/admin/events/${id}`, request);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/admin/events/${id}`);
  }

  getRegistrations(id: number): Observable<RegistrationItem[]> {
    return this.http.get<RegistrationItem[]>(`${environment.apiBaseUrl}/admin/events/${id}/registrations`);
  }

  deleteRegistration(eventId: number, registrationId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/admin/events/${eventId}/registrations/${registrationId}`);
  }
}
