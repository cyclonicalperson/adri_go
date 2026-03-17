export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  username: string;
  token: string;
  expiresAtUtc: string;
}

export interface AdminSession {
  username: string;
  token: string;
  expiresAtUtc: string;
}
