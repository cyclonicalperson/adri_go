export type EventCategory =
  | 'CONCERT'
  | 'FESTIVAL'
  | 'SPORT'
  | 'EXHIBITION'
  | 'TOUR'
  | 'THEATER'
  | 'CONFERENCE'
  | 'OTHER';

export interface TouristEvent {
  eventId: number;
  destinationId: number | null;
  objectId: number | null;
  organizationId: number | null;
  name: string;
  category: EventCategory;
  description: string;
  startAt: string;
  endAt: string;
  ticketUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdBy: number;
  createdAt: string;
  destination?: { destinationId: number; name: string };
  object?: { objectId: number; name: string };
  media?: Media[];
}

export interface CreateEventRequest {
  destinationId?: number;
  objectId?: number;
  name: string;
  category: EventCategory;
  description: string;
  startAt: string;
  endAt: string;
  ticketUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> { }

import { Media } from './destination.model';
