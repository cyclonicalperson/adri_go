// src/environments/environment.ts
// Ovo je RAZVOJNA konfiguracija — koristi se sa ng serve.
// angular.json NEMA fileReplacements za development,
// pa Angular direktno čita ovaj fajl pri ng serve.
// Mock interceptori se aktiviraju kada je production: false.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
};
