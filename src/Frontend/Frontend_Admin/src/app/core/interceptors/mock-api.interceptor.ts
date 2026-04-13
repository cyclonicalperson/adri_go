import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

// =============================================================================
// MOCK DATA — usklađeno sa turisticka_baza_v2.sql
// =============================================================================

// ── Regions ───────────────────────────────────────────────────────────────────
const REGIONS = [
  { regionId: 1, name: 'Žabljak', type: 'city', country: 'Montenegro', lat: 43.1556, lng: 19.1225, isActive: true, createdAt: '2024-01-01' },
  { regionId: 2, name: 'Durmitor', type: 'national_park', country: 'Montenegro', lat: 43.1500, lng: 19.0167, isActive: true, createdAt: '2024-01-01' },
  { regionId: 3, name: 'Crno jezero', type: 'lake', country: 'Montenegro', lat: 43.1378, lng: 19.0644, isActive: true, createdAt: '2024-01-01' },
  { regionId: 4, name: 'Tara kanjon', type: 'national_park', country: 'Montenegro', lat: 43.2000, lng: 19.2500, isActive: true, createdAt: '2024-01-01' },
  { regionId: 5, name: 'Budva', type: 'city', country: 'Montenegro', lat: 42.2864, lng: 18.8400, isActive: true, createdAt: '2024-01-01' },
  { regionId: 6, name: 'Kotor', type: 'city', country: 'Montenegro', lat: 42.4247, lng: 18.7712, isActive: true, createdAt: '2024-01-01' },
];

// ── Posts ─────────────────────────────────────────────────────────────────────
const POSTS = [
  {
    postId: 1, adminId: 5, regionId: 1,
    title: 'Hotel Jezera Žabljak', postType: 'accommodation',
    description: 'Četvorozvezdičani hotel smešten na obali Crnog jezera.',
    lat: 43.1378, lng: 19.0644, address: 'Žabljak bb, 84210 Žabljak',
    externalUrl: 'https://www.booking.com/hotel/me/jezera-zabljak.html', externalUrlLabel: 'Rezerviši na Booking',
    images: [], openingHours: { mon: '00:00-24:00' },
    details: { stars: 4, rooms: 86, priceFrom: 85, currency: 'EUR' },
    status: 'published', viewCount: 3, likeCount: 3, saveCount: 3, reviewCount: 2, avgRating: 4.5,
    publishedAt: '2024-03-01T09:00:00', createdAt: '2024-03-01T09:00:00', updatedAt: '2024-03-01T09:00:00',
    adminName: 'Stefan Radović', adminRole: 'admin', adminOrganizationId: 4,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 2, adminId: 5, regionId: 1,
    title: 'Restoran Soa', postType: 'restaurant',
    description: 'Tradicionalna crnogorska kuhinja sa lokalno uzgojenim namirnicama.',
    lat: 43.1556, lng: 19.1225, address: 'Njegoševa 12, Žabljak',
    externalUrl: null, externalUrlLabel: null,
    images: [], openingHours: { mon: '12:00-22:00' },
    details: { cuisine: 'Montenegrin', priceRange: '€€', capacity: 60 },
    status: 'published', viewCount: 2, likeCount: 2, saveCount: 0, reviewCount: 0, avgRating: null,
    publishedAt: '2024-03-05T10:00:00', createdAt: '2024-03-05T10:00:00', updatedAt: '2024-03-05T10:00:00',
    adminName: 'Stefan Radović', adminRole: 'admin', adminOrganizationId: 4,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 3, adminId: 2, regionId: 1,
    title: 'Muzej Žabljaka', postType: 'cultural_site',
    description: 'Muzej posvećen istoriji i prirodnim bogatstvima Durmitora.',
    lat: 43.1548, lng: 19.1218, address: 'Trg Durmitorskih ratnika 2, Žabljak',
    externalUrl: 'https://muzejzabljak.me', externalUrlLabel: 'Saznaj više',
    images: [], openingHours: { tue: '09:00-17:00' },
    details: { entranceFee: 3, currency: 'EUR', guidedTours: true },
    status: 'published', viewCount: 1, likeCount: 1, saveCount: 1, reviewCount: 1, avgRating: 4.0,
    publishedAt: '2024-03-08T11:00:00', createdAt: '2024-03-08T11:00:00', updatedAt: '2024-03-08T11:00:00',
    adminName: 'Ana Kovačević', adminRole: 'admin', adminOrganizationId: 1,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 4, adminId: 4, regionId: 1,
    title: 'Durmitor Summer Fest 2025', postType: 'event',
    description: 'Trodnevni muzički festival pod vedrim nebom na Žabljaku.',
    lat: 43.1560, lng: 19.1230, address: 'Stadion Žabljak',
    externalUrl: 'https://durmitorsummerfest.me/karte', externalUrlLabel: 'Kupi kartu',
    images: [], openingHours: null,
    details: { eventStart: '2025-07-18 18:00:00', eventEnd: '2025-07-20 23:59:00', price: 15, currency: 'EUR', category: 'FESTIVAL' },
    status: 'published', viewCount: 2, likeCount: 2, saveCount: 2, reviewCount: 1, avgRating: 5.0,
    publishedAt: '2024-04-01T09:00:00', createdAt: '2024-04-01T09:00:00', updatedAt: '2024-04-01T09:00:00',
    adminName: 'Jovana Milić', adminRole: 'admin', adminOrganizationId: 3,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 5, adminId: 3, regionId: 3,
    title: 'Crno jezero', postType: 'attraction',
    description: 'Simbol Durmitora i cijele Crne Gore. Glacijalnog porekla.',
    lat: 43.1378, lng: 19.0644, address: 'NP Durmitor, Žabljak',
    externalUrl: null, externalUrlLabel: null,
    images: [], openingHours: { mon: '00:00-24:00' },
    details: { entranceFee: 5, currency: 'EUR', perimeterKm: 3.6, altitudeM: 1416 },
    status: 'published', viewCount: 5, likeCount: 5, saveCount: 2, reviewCount: 2, avgRating: 4.5,
    publishedAt: '2024-02-15T08:00:00', createdAt: '2024-02-15T08:00:00', updatedAt: '2024-02-15T08:00:00',
    adminName: 'Nikola Đurić', adminRole: 'admin', adminOrganizationId: 2,
    region: { regionId: 3, name: 'Crno jezero', type: 'lake', lat: 43.1378, lng: 19.0644, country: 'Montenegro' },
  },
  {
    postId: 6, adminId: 2, regionId: 1,
    title: 'Apartmani Durmitor View', postType: 'accommodation',
    description: 'Privatni apartmani sa pogledom na Durmitor.',
    lat: 43.1570, lng: 19.1235, address: 'Vuka Karadžića 8, Žabljak',
    externalUrl: 'https://www.airbnb.com/rooms/durmitorview', externalUrlLabel: 'Rezerviši na Airbnb',
    images: [], openingHours: null,
    details: { priceFrom: 45, currency: 'EUR', numApartments: 6 },
    status: 'published', viewCount: 1, likeCount: 1, saveCount: 1, reviewCount: 1, avgRating: 4.0,
    publishedAt: '2024-03-20T10:00:00', createdAt: '2024-03-20T10:00:00', updatedAt: '2024-03-20T10:00:00',
    adminName: 'Ana Kovačević', adminRole: 'admin', adminOrganizationId: 1,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 7, adminId: 4, regionId: 5,
    title: 'Club Aquarius Budva', postType: 'club',
    description: 'Najpopularniji beach club na Crnogorskom primorju.',
    lat: 42.2820, lng: 18.8390, address: 'Slovenska plaža, Budva',
    externalUrl: null, externalUrlLabel: null,
    images: [], openingHours: { fri: '22:00-06:00', sat: '22:00-06:00' },
    details: { capacity: 1500, entryFee: 10, currency: 'EUR' },
    status: 'published', viewCount: 2, likeCount: 2, saveCount: 2, reviewCount: 0, avgRating: null,
    publishedAt: '2024-05-01T12:00:00', createdAt: '2024-05-01T12:00:00', updatedAt: '2024-05-01T12:00:00',
    adminName: 'Jovana Milić', adminRole: 'admin', adminOrganizationId: 3,
    region: { regionId: 5, name: 'Budva', type: 'city', lat: 42.2864, lng: 18.8400, country: 'Montenegro' },
  },
  {
    postId: 8, adminId: 6, regionId: 2,
    title: 'Ski centar Savin Kuk', postType: 'sports_facility',
    description: 'Skijalište na 2313m nadmorske visine. 4 žičare, 12 staza.',
    lat: 43.1789, lng: 19.0456, address: 'Savin Kuk, NP Durmitor',
    externalUrl: null, externalUrlLabel: null,
    images: [], openingHours: { mon: '09:00-16:00' },
    details: { lifts: 4, slopes: 12, totalKm: 18, skiSchool: true, dayPass: 25, currency: 'EUR' },
    status: 'published', viewCount: 3, likeCount: 3, saveCount: 1, reviewCount: 2, avgRating: 4.5,
    publishedAt: '2024-11-01T08:00:00', createdAt: '2024-11-01T08:00:00', updatedAt: '2024-11-01T08:00:00',
    adminName: 'Petar Vuković', adminRole: 'admin', adminOrganizationId: null,
    region: { regionId: 2, name: 'Durmitor', type: 'national_park', lat: 43.1500, lng: 19.0167, country: 'Montenegro' },
  },
  {
    postId: 9, adminId: 4, regionId: 1,
    title: 'Jazz veče u Žabljaku', postType: 'event',
    description: 'Specijalno jazz veče sa domaćim i stranim muzičarima.',
    lat: 43.1556, lng: 19.1225, address: 'Kulturni centar Žabljak',
    externalUrl: null, externalUrlLabel: null,
    images: [], openingHours: null,
    details: { eventStart: '2025-08-15 20:00:00', eventEnd: '2025-08-15 23:00:00', price: 8, currency: 'EUR', category: 'CONCERT' },
    status: 'draft', viewCount: 0, likeCount: 0, saveCount: 0, reviewCount: 0, avgRating: null,
    publishedAt: null, createdAt: '2025-07-01T10:00:00', updatedAt: '2025-07-01T10:00:00',
    adminName: 'Jovana Milić', adminRole: 'admin', adminOrganizationId: 3,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 10, adminId: 3, regionId: 4,
    title: 'Raftingom kroz kanjon Tare', postType: 'event',
    description: 'Adrenalinska tura raftingom kroz najdublji kanjon Evrope.',
    lat: 43.2000, lng: 19.2500, address: 'Kanjon Tare, polazište Šćepan Polje',
    externalUrl: 'https://montenegro-adventures.me/rafting', externalUrlLabel: 'Rezerviši',
    images: [], openingHours: null,
    details: { eventStart: '2025-09-05 09:00:00', eventEnd: '2025-09-05 17:00:00', price: 45, currency: 'EUR', category: 'SPORT' },
    status: 'draft', viewCount: 0, likeCount: 0, saveCount: 0, reviewCount: 0, avgRating: null,
    publishedAt: null, createdAt: '2025-07-02T10:00:00', updatedAt: '2025-07-02T10:00:00',
    adminName: 'Nikola Đurić', adminRole: 'admin', adminOrganizationId: 2,
    region: { regionId: 4, name: 'Tara kanjon', type: 'national_park', lat: 43.2000, lng: 19.2500, country: 'Montenegro' },
  },
  {
    postId: 11, adminId: 5, regionId: 1,
    title: 'Zimski kup Savin Kuk 2026', postType: 'event',
    description: 'Takmičenje u alpskom skijanju za sve uzraste.',
    lat: 43.1789, lng: 19.0456, address: 'Ski centar Savin Kuk',
    externalUrl: null, externalUrlLabel: null,
    images: [], openingHours: null,
    details: { eventStart: '2026-01-20 10:00:00', eventEnd: '2026-01-21 16:00:00', price: 5, currency: 'EUR', category: 'SPORT' },
    status: 'draft', viewCount: 0, likeCount: 0, saveCount: 0, reviewCount: 0, avgRating: null,
    publishedAt: null, createdAt: '2025-07-03T10:00:00', updatedAt: '2025-07-03T10:00:00',
    adminName: 'Stefan Radović', adminRole: 'admin', adminOrganizationId: 4,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 12, adminId: 6, regionId: 6,
    title: 'Kafić "Stari Kotor"', postType: 'restaurant',
    description: 'Tradicionalni kafić u staroj gradskoj jezgri Kotora.',
    lat: 42.4247, lng: 18.7712, address: 'Trg od Oružja 5, Kotor',
    externalUrl: null, externalUrlLabel: null,
    images: [], openingHours: { mon: '08:00-23:00' },
    details: { cuisine: 'Montenegrin', priceRange: '€', capacity: 40 },
    status: 'draft', viewCount: 0, likeCount: 0, saveCount: 0, reviewCount: 0, avgRating: null,
    publishedAt: null, createdAt: '2025-06-20T10:00:00', updatedAt: '2025-06-20T10:00:00',
    adminName: 'Petar Vuković', adminRole: 'admin', adminOrganizationId: null,
    region: { regionId: 6, name: 'Kotor', type: 'city', lat: 42.4247, lng: 18.7712, country: 'Montenegro' },
  },
  {
    postId: 13, adminId: 2, regionId: 5,
    title: 'Surf škola Budva', postType: 'sports_facility',
    description: 'Škola surfanja za početnike i napredne.',
    lat: 42.2820, lng: 18.8380, address: 'Slovenska plaža, Budva',
    externalUrl: 'https://surfbudva.me', externalUrlLabel: 'Saznaj više',
    images: [], openingHours: { mon: '09:00-18:00' },
    details: { pricePerLesson: 30, currency: 'EUR', minAge: 12 },
    status: 'draft', viewCount: 0, likeCount: 0, saveCount: 0, reviewCount: 0, avgRating: null,
    publishedAt: null, createdAt: '2025-06-25T10:00:00', updatedAt: '2025-06-25T10:00:00',
    adminName: 'Ana Kovačević', adminRole: 'admin', adminOrganizationId: 1,
    region: { regionId: 5, name: 'Budva', type: 'city', lat: 42.2864, lng: 18.8400, country: 'Montenegro' },
  },
];

const ADMIN_POST_IDS = new Set([3, 6]);

// ── Routes ────────────────────────────────────────────────────────────────────
const ROUTES = [
  {
    routeId: 1, adminId: 3, regionId: 2,
    name: 'Staza oko Crnog jezera', difficulty: 'easy',
    distanceKm: 3.6, durationMin: 60, elevationGainM: 30,
    description: 'Kružna staza oko Crnog jezera. Idealna za početnike i porodice.',
    waypoints: [
      { lat: 43.1378, lng: 19.0644, name: 'Ulaz — parking' },
      { lat: 43.1420, lng: 19.0610, name: 'Vidikovac' },
      { lat: 43.1378, lng: 19.0644, name: 'Povratak' },
    ],
    gpxFilePath: null, images: [], status: 'published', viewCount: 0, saveCount: 4,
    createdAt: '2024-02-01', updatedAt: '2024-02-01',
    adminName: 'Nikola Đurić',
    region: { regionId: 2, name: 'Durmitor', lat: 43.1500, lng: 19.0167 },
  },
  {
    routeId: 2, adminId: 6, regionId: 2,
    name: 'Vrh Bobotov Kuk', difficulty: 'hard',
    distanceKm: 14.0, durationMin: 360, elevationGainM: 900,
    description: 'Najzahtevnija tura na najviši vrh Durmitora (2523m).',
    waypoints: [
      { lat: 43.1378, lng: 19.0644, name: 'Polazište' },
      { lat: 43.1550, lng: 19.0300, name: 'Vrh 2523m' },
    ],
    gpxFilePath: null, images: [], status: 'published', viewCount: 0, saveCount: 2,
    createdAt: '2024-02-10', updatedAt: '2024-02-10',
    adminName: 'Petar Vuković',
    region: { regionId: 2, name: 'Durmitor', lat: 43.1500, lng: 19.0167 },
  },
  {
    routeId: 3, adminId: 3, regionId: 4,
    name: 'Kanjon Tare — pešačka staza', difficulty: 'moderate',
    distanceKm: 8.5, durationMin: 180, elevationGainM: 420,
    description: 'Staza duž kanjona reke Tare.',
    waypoints: [
      { lat: 43.2000, lng: 19.2500, name: 'Polazište' },
      { lat: 43.2300, lng: 19.2200, name: 'Vidikovac' },
    ],
    gpxFilePath: null, images: [], status: 'published', viewCount: 0, saveCount: 1,
    createdAt: '2024-02-15', updatedAt: '2024-02-15',
    adminName: 'Nikola Đurić',
    region: { regionId: 4, name: 'Tara kanjon', lat: 43.2000, lng: 19.2500 },
  },
];

// ── Reviews ───────────────────────────────────────────────────────────────────
const REVIEWS = [
  { reviewId: 1, touristId: 1, postId: 5, routeId: null, rating: 5, comment: 'Neverovatno lepo!', status: 'APPROVED', createdAt: '2024-06-01', touristName: 'Emma Wilson', entityType: 'OBJECT', entityName: 'Crno jezero', postType: 'attraction' },
  { reviewId: 2, touristId: 2, postId: 5, routeId: null, rating: 4, comment: 'Prelepo, ali previše turista.', status: 'APPROVED', createdAt: '2024-06-05', touristName: 'Luca Rossi', entityType: 'OBJECT', entityName: 'Crno jezero', postType: 'attraction' },
  { reviewId: 3, touristId: 3, postId: 1, routeId: null, rating: 5, comment: 'Odličan hotel, predivna lokacija.', status: 'APPROVED', createdAt: '2024-06-08', touristName: 'Jana Novák', entityType: 'OBJECT', entityName: 'Hotel Jezera Žabljak', postType: 'accommodation' },
  { reviewId: 4, touristId: 4, postId: 3, routeId: null, rating: 4, comment: 'Zanimljiv muzej sa dobrom zbirkom.', status: 'APPROVED', createdAt: '2024-06-10', touristName: 'Aleksandra P.', entityType: 'OBJECT', entityName: 'Muzej Žabljaka', postType: 'cultural_site' },
  { reviewId: 5, touristId: 1, postId: 6, routeId: null, rating: 4, comment: 'Lepi apartmani, čisti i opremljeni.', status: 'APPROVED', createdAt: '2024-06-12', touristName: 'Emma Wilson', entityType: 'OBJECT', entityName: 'Apartmani Durmitor', postType: 'accommodation' },
  { reviewId: 6, touristId: 5, postId: 8, routeId: null, rating: 5, comment: 'Savin Kuk je fantastičan!', status: 'APPROVED', createdAt: '2024-12-15', touristName: 'Thomas Müller', entityType: 'OBJECT', entityName: 'Ski centar Savin Kuk', postType: 'sports_facility' },
  { reviewId: 7, touristId: 2, postId: 4, routeId: null, rating: 5, comment: 'Festival je bio odličan!', status: 'APPROVED', createdAt: '2025-07-21', touristName: 'Luca Rossi', entityType: 'EVENT', entityName: 'Durmitor Summer Fest', postType: 'event' },
  { reviewId: 8, touristId: 3, postId: 8, routeId: null, rating: 4, comment: 'Dobro skijalište, gužve vikendom.', status: 'APPROVED', createdAt: '2025-01-10', touristName: 'Jana Novák', entityType: 'OBJECT', entityName: 'Ski centar Savin Kuk', postType: 'sports_facility' },
  { reviewId: 9, touristId: 1, postId: null, routeId: 1, rating: 5, comment: 'Prelepa staza!', status: 'APPROVED', createdAt: '2024-07-01', touristName: 'Emma Wilson', entityType: 'ROUTE', entityName: 'Staza oko Crnog jezera', postType: null },
  { reviewId: 10, touristId: 5, postId: null, routeId: 2, rating: 4, comment: 'Teška tura ali vredna svake kapi.', status: 'PENDING', createdAt: '2025-02-01', touristName: 'Thomas Müller', entityType: 'ROUTE', entityName: 'Vrh Bobotov Kuk', postType: null },
  { reviewId: 11, touristId: 2, postId: 7, routeId: null, rating: 2, comment: 'Previše buke, nisam mogla spavati.', status: 'PENDING', createdAt: '2025-05-01', touristName: 'Luca Rossi', entityType: 'OBJECT', entityName: 'Club Aquarius Budva', postType: 'club' },
];

const ADMIN_REVIEW_POST_IDS = new Set([3, 6]);

// ── Admin users ───────────────────────────────────────────────────────────────
const ADMIN_USERS = [
  { userId: 1, organizationId: null, fullName: 'Marko Petrović', email: 'superadmin@touristhub.me', role: 'superadmin', isIndividual: true, accountStatus: 'active', createdAt: '2024-01-01', emailVerifiedAt: '2024-01-01', organization: null, isActive: true, permissionCount: 0 },
  { userId: 2, organizationId: 1, fullName: 'Ana Kovačević', email: 'ana.kovacevic@zabljak.travel', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-15', emailVerifiedAt: '2024-01-15', organization: { organizationId: 1, name: 'TuristOrg Žabljak', type: 'municipality', contactEmail: 'info@zabljak.travel', isVerified: true }, isActive: true, permissionCount: 7 },
  { userId: 3, organizationId: 2, fullName: 'Nikola Đurić', email: 'nikola.djuric@npdurmitor.me', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-16', emailVerifiedAt: '2024-01-16', organization: { organizationId: 2, name: 'NP Durmitor', type: 'municipality', contactEmail: 'info@npdurmitor.me', isVerified: true }, isActive: true, permissionCount: 0 },
  { userId: 4, organizationId: 3, fullName: 'Jovana Milić', email: 'jovana.milic@mnadv.me', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-17', emailVerifiedAt: '2024-01-17', organization: { organizationId: 3, name: 'Montenegro Adventures', type: 'tourist_agency', contactEmail: 'hello@mnadv.me', isVerified: true }, isActive: true, permissionCount: 0 },
  { userId: 5, organizationId: 4, fullName: 'Stefan Radović', email: 'stefan.radovic@hoteljezera.me', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-18', emailVerifiedAt: '2024-01-18', organization: { organizationId: 4, name: 'Hotel Jezera Žabljak', type: 'hotel_chain', contactEmail: 'rezervacije@jezera.me', isVerified: true }, isActive: true, permissionCount: 0 },
  { userId: 6, organizationId: null, fullName: 'Petar Vuković', email: 'petar.vukovic@gmail.com', role: 'admin', isIndividual: true, accountStatus: 'suspended', createdAt: '2024-01-19', emailVerifiedAt: '2024-01-19', organization: null, isActive: false, permissionCount: 0 },
];

// ── Permissions ───────────────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  { id: 1, code: 'create_accommodation', label: 'Kreiranje smeštaja', category: 'content', description: 'Dodavanje hotela, apartmana' },
  { id: 2, code: 'create_restaurant', label: 'Kreiranje restorana', category: 'content', description: 'Dodavanje restorana i kafića' },
  { id: 3, code: 'create_club', label: 'Kreiranje klubova', category: 'content', description: 'Dodavanje noćnih klubova' },
  { id: 4, code: 'create_event', label: 'Kreiranje dogadjaja', category: 'content', description: 'Dodavanje koncerata, tura' },
  { id: 5, code: 'create_route', label: 'Kreiranje ruta', category: 'content', description: 'Dodavanje ruta' },
  { id: 6, code: 'create_cultural_site', label: 'Kreiranje kulturnih mesta', category: 'content', description: 'Dodavanje muzeja, galerija' },
  { id: 7, code: 'create_monument', label: 'Kreiranje spomenika', category: 'content', description: 'Dodavanje istorijskih mesta' },
  { id: 8, code: 'create_sports', label: 'Kreiranje sportskih obj.', category: 'content', description: 'Dodavanje sportskih terena' },
  { id: 9, code: 'create_shop', label: 'Kreiranje prodavnica', category: 'content', description: 'Dodavanje prodavnica' },
  { id: 10, code: 'manage_reviews', label: 'Upravljanje recenzijama', category: 'content', description: 'Moderacija recenzija' },
  { id: 11, code: 'view_analytics', label: 'Pregled analitike', category: 'analytics', description: 'Pregled statistika' },
  { id: 12, code: 'manage_own_posts', label: 'Upravljanje vlastitim obj.', category: 'content', description: 'Editovanje vlastitih objava' },
  { id: 13, code: 'manage_tags', label: 'Upravljanje tagovima', category: 'content', description: 'Dodavanje i uredjivanje tagova' },
  { id: 14, code: 'manage_translations', label: 'Upravljanje prevodima', category: 'content', description: 'Dodavanje prevoda' },
  { id: 15, code: 'view_tourists', label: 'Pregled turista', category: 'analytics', description: 'Pregled podataka o turistima' },
  { id: 16, code: 'manage_tickets', label: 'Upravljanje kartama', category: 'content', description: 'Upravljanje ulaznicama' },
];

const ANA_PERMISSIONS = [4, 5, 6, 7, 11, 10, 12].map(id => ({
  id,
  adminUserId: 2,
  permission: ALL_PERMISSIONS.find(p => p.id === id)!,
  regionId: null,
  grantedBy: 1,
  grantedAt: '2024-01-15',
}));

// ── Registration requests ─────────────────────────────────────────────────────
const REGISTRATION_REQUESTS = [
  { id: 1, fullName: 'Milica Stanković', email: 'milica.s@gmail.com', isIndividual: true, organizationName: null, organizationEmail: null, emailVerifiedAt: '2024-06-01T12:00:00', status: 'pending', rejectionReason: null, submittedAt: '2024-06-01T10:00:00', reviewedAt: null, reviewedBy: null, documentUrl: '/documents/milica_licna.pdf' },
  { id: 2, fullName: 'Boris Nikolić', email: 'boris@adventureme.com', isIndividual: false, organizationName: 'Adventure Montenegro', organizationEmail: 'info@adventureme.com', emailVerifiedAt: null, status: 'pending', rejectionReason: null, submittedAt: '2024-06-02T09:30:00', reviewedAt: null, reviewedBy: null, documentUrl: null },
  { id: 3, fullName: 'Sanja Đokić', email: 'sanja.djokic@kotor.travel', isIndividual: false, organizationName: 'Kotor Tours', organizationEmail: 'info@kotor.travel', emailVerifiedAt: '2024-05-20T08:00:00', status: 'approved', rejectionReason: null, submittedAt: '2024-05-19T14:00:00', reviewedAt: '2024-05-21T10:00:00', reviewedBy: 1, documentUrl: '/documents/kotortours_reg.pdf' },
  { id: 4, fullName: 'Dragan Vukić', email: 'dragan.v@gmail.com', isIndividual: true, organizationName: null, organizationEmail: null, emailVerifiedAt: null, status: 'rejected', rejectionReason: 'Email nije verifikovan u predvidjenom roku.', submittedAt: '2024-05-10T11:00:00', reviewedAt: '2024-05-17T09:00:00', reviewedBy: 1, documentUrl: null },
];

// ── Notifications ─────────────────────────────────────────────────────────────
const ADMIN_NOTIFICATIONS: Record<number, any[]> = {
  1: [
    { id: 1, adminUserId: 1, type: 'new_registration', title: 'Novi zahtev za registraciju', body: 'Milica Stanković čeka odobrenje naloga.', payload: { url: '/admin/zahtevi' }, isRead: false, createdAt: '2024-06-01T10:00:00', sentAt: null, time: 'Pre 12 min' },
    { id: 2, adminUserId: 1, type: 'pending_review', title: 'Nova recenzija na moderaciji', body: 'Turist ostavio recenziju za Hotel Jezera.', payload: { url: '/admin/reviews' }, isRead: false, createdAt: '2024-06-02T09:00:00', sentAt: null, time: 'Pre 1 sat' },
    { id: 3, adminUserId: 1, type: 'pending_review', title: 'Negativna recenzija', body: 'Recenzija sa ocenom 2/5 za Club Aquarius.', payload: { url: '/admin/reviews' }, isRead: true, createdAt: '2025-05-01T08:00:00', sentAt: null, time: 'Pre 2 sata' },
  ],
  2: [
    { id: 4, adminUserId: 2, type: 'post_approved', title: 'Muzej Žabljaka odobren', body: 'Vaša objava "Muzej Žabljaka" je odobrena.', payload: { url: '/admin/lokacije' }, isRead: false, createdAt: '2024-03-09T11:00:00', sentAt: null, time: 'Pre 3 sata' },
    { id: 5, adminUserId: 2, type: 'system', title: 'Dobrodošli na platformu', body: 'Vaš nalog je aktivan.', payload: { url: '/admin/dashboard' }, isRead: true, createdAt: '2024-01-15T10:00:00', sentAt: null, time: 'Pre 7 meseci' },
  ],
};

// ── Dashboard stats ───────────────────────────────────────────────────────────
const SUPERADMIN_STATS = { totalTourists: 5, totalAdmins: 5, totalPosts: 9, totalRoutes: 3, pendingRegistrations: 2, pendingReviews: 2, ticketsIssued: 3, unreadNotifications: 2 };
const ADMIN_STATS = { totalTourists: 0, totalAdmins: 0, totalPosts: 2, totalRoutes: 0, pendingRegistrations: 0, pendingReviews: 1, ticketsIssued: 0, unreadNotifications: 1 };

// ── Region popularity ─────────────────────────────────────────────────────────
const REGION_POPULARITY = [
  { regionId: 1, name: 'Žabljak', type: 'city', numPosts: 7, totalViews: 11, totalLikes: 11, avgRating: 4.3 },
  { regionId: 2, name: 'Durmitor', type: 'national_park', numPosts: 1, totalViews: 3, totalLikes: 3, avgRating: 4.5 },
  { regionId: 3, name: 'Crno jezero', type: 'lake', numPosts: 1, totalViews: 5, totalLikes: 5, avgRating: 4.5 },
  { regionId: 4, name: 'Tara kanjon', type: 'national_park', numPosts: 0, totalViews: 0, totalLikes: 0, avgRating: null },
  { regionId: 5, name: 'Budva', type: 'city', numPosts: 2, totalViews: 2, totalLikes: 2, avgRating: null },
];

// ── Tourist movements ─────────────────────────────────────────────────────────
const MOVEMENTS = [
  { regionId: 1, regionName: 'Žabljak', latitude: 43.1556, longitude: 19.1225, visitCount: 11 },
  { regionId: 3, regionName: 'Crno jezero', latitude: 43.1378, longitude: 19.0644, visitCount: 5 },
  { regionId: 2, regionName: 'Durmitor', latitude: 43.1500, longitude: 19.0167, visitCount: 3 },
  { regionId: 5, regionName: 'Budva', latitude: 42.2864, longitude: 18.8400, visitCount: 2 },
];

// ── Daily visits ──────────────────────────────────────────────────────────────
const DAILY_VISITS = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  count: Math.floor(Math.random() * 12 + 2),
}));

// ── Activities ────────────────────────────────────────────────────────────────
const ACTIVITIES = [
  { activityId: 1, name: 'Pešačenje', category: 'ADVENTURE', description: 'Pešačke ture kroz NP Durmitor.', lat: 43.1500, lng: 19.0167, locationName: 'NP Durmitor' },
  { activityId: 2, name: 'Ski i snowboard', category: 'SPORT', description: 'Skijanje na Savinom Kuku.', lat: 43.1789, lng: 19.0456, locationName: 'Savin Kuk' },
  { activityId: 3, name: 'Rafting', category: 'ADVENTURE', description: 'Rafting na reci Tari.', lat: 43.2000, lng: 19.2500, locationName: 'Kanjon Tare' },
  { activityId: 4, name: 'Paraglajding', category: 'ADVENTURE', description: 'Let paraglajderom sa Žabljaka.', lat: 43.1556, lng: 19.1225, locationName: 'Žabljak' },
  { activityId: 5, name: 'Spa i wellness', category: 'WELLNESS', description: 'Wellness tretmani u hotelima.', lat: 43.1378, lng: 19.0644, locationName: 'Hotel Jezera' },
  { activityId: 6, name: 'Kulinarske ture', category: 'DINING', description: 'Degustacija crnogorske kuhinje.', lat: 43.1556, lng: 19.1225, locationName: 'Žabljak' },
  { activityId: 7, name: 'Poseta vinskim podrumima', category: 'DINING', description: 'Obilazak vinskih podruma.', lat: 42.2864, lng: 18.8400, locationName: 'Budva' },
  { activityId: 8, name: 'Ronjenje', category: 'SPORT', description: 'Ronjenje u Jadranskom moru.', lat: 42.2820, lng: 18.8390, locationName: 'Budva' },
  { activityId: 9, name: 'Noćna razgledanja', category: 'SIGHTSEEING', description: 'Vodjene noćne ture kroz gradove.', lat: 42.4247, lng: 18.7712, locationName: 'Kotor' },
  { activityId: 10, name: 'Fotografske ture', category: 'SIGHTSEEING', description: 'Foto-ture na najlepšim lokacijama.', lat: 43.1378, lng: 19.0644, locationName: 'Crno jezero' },
  { activityId: 11, name: 'Biciklizam', category: 'SPORT', description: 'Mountain bike staze kroz Durmitor.', lat: 43.1500, lng: 19.0167, locationName: 'NP Durmitor' },
  { activityId: 12, name: 'Kupovina suvenira', category: 'SHOPPING', description: 'Lokalne radionice i suvenirnice.', lat: 43.1556, lng: 19.1225, locationName: 'Žabljak' },
];

// =============================================================================
// HELPERS
// =============================================================================

function paginate<T>(data: T[], page = 1, pageSize = 10) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { data: data.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages };
}

function ok(body: unknown) {
  return of(new HttpResponse({ status: 200, body }));
}

function currentUser(): { userId: number; role: string } | null {
  try { return JSON.parse(localStorage.getItem('tg_user') ?? 'null'); } catch { return null; }
}

// =============================================================================
// INTERCEPTOR
// =============================================================================

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  const params = req.params;
  const user = currentUser();

  const isSuperAdmin = user?.role === 'superadmin';
  const userId = user?.userId ?? 0;
  const page = +(params.get('page') ?? 1);
  const pageSize = +(params.get('pageSize') ?? 10);

  // ── Analytics ──────────────────────────────────────────────────────────────
  if (url.includes('/analytics/stats')) return ok({ data: isSuperAdmin ? SUPERADMIN_STATS : ADMIN_STATS, success: true });
  if (url.includes('/analytics/visits')) return ok({ data: DAILY_VISITS, success: true });
  if (url.includes('/analytics/popular/posts')) {
    const posts = isSuperAdmin ? POSTS : POSTS.filter(p => ADMIN_POST_IDS.has(p.postId));
    return ok({ data: posts.filter(p => p.postType !== 'event').sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map(p => ({ id: p.postId, title: p.title, postType: p.postType, viewCount: p.viewCount, likeCount: p.likeCount, avgRating: p.avgRating, regionName: p.region?.name ?? null, adminName: p.adminName })), success: true });
  }
  if (url.includes('/analytics/popular/events')) {
    const posts = isSuperAdmin ? POSTS : POSTS.filter(p => ADMIN_POST_IDS.has(p.postId));
    return ok({ data: posts.filter(p => p.postType === 'event').sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map(p => ({ id: p.postId, title: p.title, postType: p.postType, viewCount: p.viewCount, likeCount: p.likeCount, avgRating: p.avgRating, regionName: p.region?.name ?? null, adminName: p.adminName })), success: true });
  }
  if (url.includes('/analytics/regions')) return ok({ data: REGION_POPULARITY, success: true });
  if (url.includes('/analytics/movements')) return ok({ data: MOVEMENTS, success: true });

  // ── Posts ──────────────────────────────────────────────────────────────────
  if (url.includes('/posts') && req.method === 'GET' && !url.match(/\/posts\/\d+/)) {
    let list = isSuperAdmin ? [...POSTS] : POSTS.filter(p => ADMIN_POST_IDS.has(p.postId));
    const types = params.getAll('postType') ?? []; if (types.length) list = list.filter(p => types.includes(p.postType));
    const rid = params.get('regionId'); if (rid) list = list.filter(p => p.regionId === +rid);
    const status = params.get('status'); if (status) list = list.filter(p => p.status === status);
    const q = params.get('search'); if (q) list = list.filter(p => p.title.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/posts\/(\d+)$/) && req.method === 'GET') {
    return ok({ data: POSTS.find(p => p.postId === +url.split('/').pop()!) ?? null, success: true });
  }

  // ── Regions ────────────────────────────────────────────────────────────────
  if (url.includes('/regions') && req.method === 'GET' && !url.match(/\/regions\/\d+/)) {
    let list = [...REGIONS];
    const q = params.get('search'); if (q) list = list.filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/regions\/(\d+)$/) && req.method === 'GET') {
    return ok({ data: REGIONS.find(r => r.regionId === +url.split('/').pop()!) ?? null, success: true });
  }

  // ── Objects (Lokacije) — maps non-event posts to TouristObject interface ──
  if (url.includes('/objects') && req.method === 'GET' && !url.match(/\/objects\/\d+/)) {
    const catMap: Record<string, string> = {
      accommodation: 'HOTEL', restaurant: 'RESTAURANT', club: 'CLUB',
      cultural_site: 'CULTURAL', monument: 'MONUMENT', sports_facility: 'SPORT',
      attraction: 'NATURE', shop: 'SHOP', other: 'OTHER',
    };
    let list = (isSuperAdmin ? POSTS : POSTS.filter(p => ADMIN_POST_IDS.has(p.postId)))
      .filter(p => p.postType !== 'event')
      .map(p => ({
        objectId: p.postId,
        destinationId: p.regionId,
        regionId: p.regionId,
        name: p.title,
        category: catMap[p.postType] ?? 'OTHER',
        description: p.description,
        address: p.address ?? '',
        latitude: p.lat,
        longitude: p.lng,
        phone: '',
        website: p.externalUrl ?? '',
        workingHours: '',
        createdBy: p.adminId,
        createdAt: p.createdAt,
        destination: p.region ? { destinationId: p.region.regionId, name: p.region.name } : null,
        region: p.region ? { regionId: p.region.regionId, name: p.region.name } : null,
        averageRating: p.avgRating,
        reviewCount: p.reviewCount,
        status: p.status,
      }));
    const cat = params.get('category'); if (cat) list = list.filter(o => o.category === cat);
    const rid = params.get('regionId') ?? params.get('destinationId'); if (rid) list = list.filter(o => o.regionId === +rid);
    const q = params.get('search'); if (q) list = list.filter(o => o.name.toLowerCase().includes(q.toLowerCase()));
    const status = params.get('status'); if (status) list = list.filter(o => (o as any).status === status);
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/objects\/(\d+)$/) && req.method === 'GET') {
    const p = POSTS.find(pp => pp.postId === +url.split('/').pop()!);
    if (!p) return ok({ data: null, success: true });
    const catMap: Record<string, string> = {
      accommodation: 'HOTEL', restaurant: 'RESTAURANT', club: 'CLUB',
      cultural_site: 'CULTURAL', monument: 'MONUMENT', sports_facility: 'SPORT',
      attraction: 'NATURE', shop: 'SHOP', other: 'OTHER',
    };
    return ok({ data: {
      objectId: p.postId, destinationId: p.regionId, regionId: p.regionId,
      name: p.title, category: catMap[p.postType] ?? 'OTHER', description: p.description,
      address: p.address ?? '', latitude: p.lat, longitude: p.lng, phone: '', website: p.externalUrl ?? '',
      workingHours: '', createdBy: p.adminId, createdAt: p.createdAt,
      destination: p.region ? { destinationId: p.region.regionId, name: p.region.name } : null,
      region: p.region, averageRating: p.avgRating, reviewCount: p.reviewCount,
    }, success: true });
  }

  // ── Routes ─────────────────────────────────────────────────────────────────
  if (url.includes('/routes') && req.method === 'GET' && !url.match(/\/routes\/\d+/)) {
    let list = [...ROUTES];
    const q = params.get('search'); if (q) list = list.filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
    const difficulty = params.get('difficulty'); if (difficulty) list = list.filter(r => r.difficulty === difficulty);
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/routes\/(\d+)$/) && req.method === 'GET') {
    return ok({ data: ROUTES.find(r => r.routeId === +url.split('/').pop()!) ?? null, success: true });
  }

  // ── Reviews ────────────────────────────────────────────────────────────────
  if (url.includes('/reviews') && req.method === 'GET' && !url.match(/\/reviews\/\d+/)) {
    let list = isSuperAdmin ? [...REVIEWS] : REVIEWS.filter(r => (r.postId && ADMIN_REVIEW_POST_IDS.has(r.postId)) || r.status === 'PENDING');
    const status = params.get('status'); if (status) list = list.filter(r => r.status === status);
    const entityType = params.get('entityType'); if (entityType) list = list.filter(r => r.entityType === entityType);
    const minRating = params.get('minRating'); if (minRating) list = list.filter(r => r.rating >= +minRating);
    const maxRating = params.get('maxRating'); if (maxRating) list = list.filter(r => r.rating <= +maxRating);
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/reviews\/\d+/) && req.method !== 'GET') return ok({ data: null, success: true });

  // ── Admin users ────────────────────────────────────────────────────────────
  if (url.includes('/admin-users') && req.method === 'GET' && !url.match(/\/admin-users\/\d+/)) {
    if (!isSuperAdmin) return ok(paginate([], page, pageSize));
    let list = ADMIN_USERS.map(u => ({
      ...u,
      permissionCount: u.userId === 2 ? ANA_PERMISSIONS.length : 0,
    }));
    const role = params.get('role'); if (role) list = list.filter(u => u.role === role);
    const status = params.get('accountStatus'); if (status) list = list.filter(u => u.accountStatus === status);
    const q = params.get('search'); if (q) list = list.filter(u => u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/admin-users\/(\d+)$/) && req.method === 'GET') {
    return ok({ data: ADMIN_USERS.find(u => u.userId === +url.split('/').pop()!) ?? null, success: true });
  }
  if (url.match(/\/admin-users\/(\d+)\/permissions$/) && req.method === 'GET') {
    return ok({ data: userId === 2 ? ANA_PERMISSIONS : [], success: true });
  }

  // ── Permissions catalogue ──────────────────────────────────────────────────
  if (url.includes('/permissions') && req.method === 'GET' && !url.includes('/admin-users')) {
    return ok({ data: ALL_PERMISSIONS, success: true });
  }

  // ── Roles ──────────────────────────────────────────────────────────────────
  if (url.endsWith('/roles') && req.method === 'GET') {
    return ok({
      data: [
        { roleId: 1, roleName: 'superadmin', description: 'Pun pristup svim funkcijama platforme' },
        { roleId: 2, roleName: 'admin', description: 'Pristup ograničen dodeljenim dozvolama' },
      ], success: true
    });
  }

  // ── Organizations ──────────────────────────────────────────────────────────
  if (url.includes('/organizations') && req.method === 'GET') {
    return ok({
      data: [
        { organizationId: 1, name: 'Turistička organizacija Žabljak', type: 'municipality', contactEmail: 'info@zabljak.travel', isVerified: true },
        { organizationId: 2, name: 'NP Durmitor', type: 'municipality', contactEmail: 'info@npdurmitor.me', isVerified: true },
        { organizationId: 3, name: 'Montenegro Adventures d.o.o.', type: 'tourist_agency', contactEmail: 'hello@mnadv.me', isVerified: true },
        { organizationId: 4, name: 'Hotel Jezera Žabljak', type: 'hotel_chain', contactEmail: 'rezervacije@jezera.me', isVerified: true },
      ], success: true
    });
  }

  // ── Registration requests ──────────────────────────────────────────────────
  if (url.includes('/registrations') && req.method === 'GET' && !url.match(/\/registrations\/\d+/)) {
    if (!isSuperAdmin) return ok(paginate([], page, pageSize));
    let list = [...REGISTRATION_REQUESTS];
    const status = params.get('status'); if (status) list = list.filter(r => r.status === status);
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/registrations\/\d+/) && req.method === 'PATCH') return ok({ data: null, success: true });

  // ── Notifications ──────────────────────────────────────────────────────────
  if (url.includes('/admin-notifications') && req.method === 'GET') {
    return ok({ data: ADMIN_NOTIFICATIONS[userId] ?? [], success: true });
  }
  if (url.includes('/admin-notifications') && req.method === 'PATCH') return ok({ data: null, success: true });

  // ── Activities ─────────────────────────────────────────────────────────────
  if (url.includes('/activities') && req.method === 'GET' && !url.match(/\/activities\/\d+/)) {
    let list = [...ACTIVITIES];
    const cat = params.get('category'); if (cat) list = list.filter(a => a.category === cat);
    const q = params.get('search'); if (q) list = list.filter(a => a.name.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/activities\/(\d+)$/) && req.method === 'GET') {
    return ok({ data: ACTIVITIES.find(a => a.activityId === +url.split('/').pop()!) ?? null, success: true });
  }

  // ── Write operations ───────────────────────────────────────────────────────
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return ok({ data: null, success: true, message: 'Mock: operacija uspešna.' });
  }

  // ── Propusti ostale (Leaflet tile CDN, itd.) ───────────────────────────────
  return next(req);
};
