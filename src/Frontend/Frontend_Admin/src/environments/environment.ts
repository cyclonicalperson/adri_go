// src/environments/environment.ts
// useMocks: true   → koristi mock interceptore (rad bez backend-a)
// useMocks: false -> koristi pravi backend API na portu 5125
export const environment = {
  production: false,
  useMocks: false,
  // SERVER (produkcija) — zakomentarisati za lokalni rad:
  // apiUrl: 'http://softeng.pmf.kg.ac.rs:10182/api',
  apiUrl: 'http://localhost:5125/api',
  adminAppUrl: 'http://localhost:4200',
  touristAppUrl: 'http://localhost:4201',
};
