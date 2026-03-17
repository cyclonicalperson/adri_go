export interface PublicEventSummary {
  id: number;
  title: string;
  shortDescription: string;
  eventDate: string;
  eventTime: string;
  location: string;
  remainingSeats: number;
  isRegistrationOpen: boolean;
}

export interface EventDetails {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  maxParticipants: number;
  registeredCount: number;
  remainingSeats: number;
  isRegistrationOpen: boolean;
  isFull: boolean;
}

export interface AdminEventListItem {
  id: number;
  title: string;
  eventDate: string;
  eventTime: string;
  location: string;
  maxParticipants: number;
  registeredCount: number;
  isRegistrationOpen: boolean;
}

export interface AdminEventDetails {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  maxParticipants: number;
  registeredCount: number;
  isRegistrationOpen: boolean;
}

export interface SaveEventRequest {
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  maxParticipants: number;
  isRegistrationOpen: boolean;
}
