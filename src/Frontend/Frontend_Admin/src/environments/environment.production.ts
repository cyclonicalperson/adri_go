// src/environments/environment.production.ts
// Produkcijska konfiguracija — ng build --configuration production
// angular.json zamenjuje environment.ts sa ovim fajlom pri production buildu.
// Mock interceptori se NE aktiviraju kada je production: true.
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api',
};
