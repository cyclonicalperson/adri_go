import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { EventDetails, PublicEventSummary } from '../models/event.model';
import { EventRegistrationRequest, EventRegistrationResponse } from '../models/registration.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(private readonly http: HttpClient) {}

  getPublicEvents(): Observable<PublicEventSummary[]> {
    return this.http.get<PublicEventSummary[]>(`${environment.apiBaseUrl}/events`);
  }

  getEventById(id: number): Observable<EventDetails> {
    return this.http.get<EventDetails>(`${environment.apiBaseUrl}/events/${id}`);
  }

  registerForEvent(id: number, request: EventRegistrationRequest): Observable<EventRegistrationResponse> {
    return this.http.post<EventRegistrationResponse>(`${environment.apiBaseUrl}/events/${id}/registrations`, request);
  }
}
