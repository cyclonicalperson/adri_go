// src/environments/environment.ts
// useMocks: false  → koristi pravi backend API na portu 5000
// useMocks: true   → koristi mock interceptore (rad bez backend-a)
export const environment = {
  production: false,
  useMocks: false,
  apiUrl: 'http://localhost:5125/api',
};
