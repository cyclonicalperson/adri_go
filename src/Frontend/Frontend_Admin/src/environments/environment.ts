// src/environments/environment.ts
// useMocks: false → koristi pravi backend API
// useMocks: true  → koristi mock interceptore (radi bez backend-a)
export const environment = {
  production: false,
  useMocks: true,
  apiUrl: 'http://localhost:5000/api',
};
