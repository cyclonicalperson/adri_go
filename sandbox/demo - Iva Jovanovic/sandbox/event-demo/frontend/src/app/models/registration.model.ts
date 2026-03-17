export interface EventRegistrationRequest {
  fullName: string;
  email: string;
}

export interface EventRegistrationResponse {
  message: string;
  registrationDate: string;
}

export interface RegistrationItem {
  id: number;
  fullName: string;
  email: string;
  registrationDate: string;
}
