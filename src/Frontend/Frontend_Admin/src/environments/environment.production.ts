// src/environments/environment.production.ts
// Produkcijska konfiguracija — ng build --configuration production
// angular.json zamenjuje environment.ts sa ovim fajlom pri production buildu.
// Mock interceptori se NE aktiviraju kada je production: true.
export const environment = {
  production: true,
  useMocks: false,
  apiUrl: 'https://softeng.pmf.kg.ac.rs:10185/api',
  adminAppUrl: 'https://softeng.pmf.kg.ac.rs:10188',
  touristAppUrl: 'https://softeng.pmf.kg.ac.rs:10187',
};
