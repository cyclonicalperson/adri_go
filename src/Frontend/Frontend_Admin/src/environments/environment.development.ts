// src/environments/environment.development.ts
// Koristi pravi .NET backend. Za mock mod postavi useMocks: true.
export const environment = {
  production: false,
  useMocks: false,
  apiUrl: 'http://localhost:5125/api',
  adminAppUrl: 'http://localhost:4200',
  touristAppUrl: 'http://localhost:4201',
};
