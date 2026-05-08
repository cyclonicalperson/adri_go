// src/environments/environment.production.ts
// Produkcijska konfiguracija — ng build --configuration production
// angular.json zamenjuje environment.ts sa ovim fajlom pri production buildu.
// Mock interceptori se NE aktiviraju kada je production: true.
export const environment = {
  production: true,
  useMocks: false,
  apiUrl: 'http://softeng.pmf.kg.ac.rs:10182/api',
  adminAppUrl: 'http://softeng.pmf.kg.ac.rs:10181',
  touristAppUrl: 'http://softeng.pmf.kg.ac.rs:10183',
};
