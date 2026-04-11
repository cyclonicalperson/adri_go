import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — mirrors turisticka_baza_v2.sql seed data
// ─────────────────────────────────────────────────────────────────────────────

// ── Regions (region table) ────────────────────────────────────────────────
const REGIONS = [
  { regionId: 1, name: 'Žabljak', type: 'city', country: 'Montenegro', lat: 43.1556, lng: 19.1225, isActive: true, createdAt: '2024-01-01' },
  { regionId: 2, name: 'Durmitor', type: 'national_park', country: 'Montenegro', lat: 43.1500, lng: 19.0167, isActive: true, createdAt: '2024-01-01' },
  { regionId: 3, name: 'Crno jezero', type: 'lake', country: 'Montenegro', lat: 43.1378, lng: 19.0644, isActive: true, createdAt: '2024-01-01' },
  { regionId: 4, name: 'Tara kanjon', type: 'national_park', country: 'Montenegro', lat: 43.2000, lng: 19.2500, isActive: true, createdAt: '2024-01-01' },
  { regionId: 5, name: 'Budva', type: 'city', country: 'Montenegro', lat: 42.2864, lng: 18.8400, isActive: true, createdAt: '2024-01-01' },
  { regionId: 6, name: 'Kotor', type: 'city', country: 'Montenegro', lat: 42.4247, lng: 18.7712, isActive: true, createdAt: '2024-01-01' },
];

// ── Posts (v_posts_full view) ─────────────────────────────────────────────
const POSTS = [
  {
    postId: 1, adminId: 5, regionId: 1,
    title: 'Hotel Jezera Žabljak', postType: 'accommodation',
    description: 'Četvorozvjezdičani hotel smješten na obali Crnog jezera.',
    lat: 43.1378, lng: 19.0644, address: 'Žabljak bb, 84210 Žabljak',
    externalUrl: 'https://www.booking.com/hotel/me/jezera-zabljak.html',
    externalUrlLabel: 'Rezerviši na Booking',
    images: ['/images/posts/jezera1.jpg'], openingHours: { mon: '00:00-24:00' },
    details: { stars: 4, rooms: 86, priceFrom: 85, currency: 'EUR' },
    status: 'published', viewCount: 3, likeCount: 3, saveCount: 3,
    reviewCount: 2, avgRating: 4.5, publishedAt: '2024-03-01T09:00:00',
    createdAt: '2024-03-01T09:00:00', updatedAt: '2024-03-01T09:00:00',
    adminName: 'Stefan Radović', adminRole: 'admin', adminOrganizationId: 4,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 2, adminId: 5, regionId: 1,
    title: 'Restoran Soa', postType: 'restaurant',
    description: 'Tradicionalna crnogorska kuhinja sa lokalno uzgojenim namirnicama.',
    lat: 43.1556, lng: 19.1225, address: 'Njegoševa 12, Žabljak',
    externalUrl: null, externalUrlLabel: null,
    images: ['/images/posts/soa1.jpg'], openingHours: { mon: '12:00-22:00' },
    details: { cuisine: 'Montenegrin', priceRange: '€€', capacity: 60 },
    status: 'published', viewCount: 2, likeCount: 2, saveCount: 0,
    reviewCount: 0, avgRating: null, publishedAt: '2024-03-05T10:00:00',
    createdAt: '2024-03-05T10:00:00', updatedAt: '2024-03-05T10:00:00',
    adminName: 'Stefan Radović', adminRole: 'admin', adminOrganizationId: 4,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 3, adminId: 2, regionId: 1,
    title: 'Muzej Žabljaka', postType: 'cultural_site',
    description: 'Muzej posvećen historiji i prirodnim bogatstvima Durmitora.',
    lat: 43.1548, lng: 19.1218, address: 'Trg Durmitorskih ratnika 2, Žabljak',
    externalUrl: 'https://muzejzabljak.me', externalUrlLabel: 'Saznaj više',
    images: ['/images/posts/muzej1.jpg'], openingHours: { tue: '09:00-17:00' },
    details: { entranceFee: 3, currency: 'EUR', guidedTours: true },
    status: 'published', viewCount: 1, likeCount: 1, saveCount: 1,
    reviewCount: 1, avgRating: 4.0, publishedAt: '2024-03-08T11:00:00',
    createdAt: '2024-03-08T11:00:00', updatedAt: '2024-03-08T11:00:00',
    adminName: 'Ana Kovačević', adminRole: 'admin', adminOrganizationId: 1,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 4, adminId: 4, regionId: 1,
    title: 'Durmitor Summer Fest 2025', postType: 'event',
    description: 'Trodnevni muzički festival pod vedrim nebom na Žabljaku.',
    lat: 43.1560, lng: 19.1230, address: 'Stadion Žabljak, Žabljak',
    externalUrl: 'https://durmitorsummerfest.me/karte', externalUrlLabel: 'Kupi kartu',
    images: ['/images/posts/fest1.jpg'], openingHours: null,
    details: { eventStart: '2025-07-18 18:00:00', eventEnd: '2025-07-20 23:59:00', price: 15, currency: 'EUR' },
    status: 'published', viewCount: 2, likeCount: 2, saveCount: 2,
    reviewCount: 1, avgRating: 5.0, publishedAt: '2024-04-01T09:00:00',
    createdAt: '2024-04-01T09:00:00', updatedAt: '2024-04-01T09:00:00',
    adminName: 'Jovana Milić', adminRole: 'admin', adminOrganizationId: 3,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 5, adminId: 3, regionId: 3,
    title: 'Crno jezero', postType: 'attraction',
    description: 'Simbol Durmitora i cijele Crne Gore. Glacijalnog porijekla.',
    lat: 43.1378, lng: 19.0644, address: 'NP Durmitor, Žabljak',
    externalUrl: null, externalUrlLabel: null,
    images: ['/images/posts/crnojezero1.jpg'], openingHours: { mon: '00:00-24:00' },
    details: { entranceFee: 5, currency: 'EUR', perimeterKm: 3.6, altitudeM: 1416 },
    status: 'published', viewCount: 5, likeCount: 5, saveCount: 2,
    reviewCount: 2, avgRating: 4.5, publishedAt: '2024-02-15T08:00:00',
    createdAt: '2024-02-15T08:00:00', updatedAt: '2024-02-15T08:00:00',
    adminName: 'Nikola Đurić', adminRole: 'admin', adminOrganizationId: 2,
    region: { regionId: 3, name: 'Crno jezero', type: 'lake', lat: 43.1378, lng: 19.0644, country: 'Montenegro' },
  },
  {
    postId: 6, adminId: 2, regionId: 1,
    title: 'Apartmani Durmitor View', postType: 'accommodation',
    description: 'Privatni apartmani sa pogledom na Durmitor.',
    lat: 43.1570, lng: 19.1235, address: 'Vuka Karadžića 8, Žabljak',
    externalUrl: 'https://www.airbnb.com/rooms/durmitorview', externalUrlLabel: 'Rezerviši na Airbnb',
    images: ['/images/posts/apt1.jpg'], openingHours: null,
    details: { priceFrom: 45, currency: 'EUR', numApartments: 6 },
    status: 'published', viewCount: 1, likeCount: 1, saveCount: 1,
    reviewCount: 1, avgRating: 4.0, publishedAt: '2024-03-20T10:00:00',
    createdAt: '2024-03-20T10:00:00', updatedAt: '2024-03-20T10:00:00',
    adminName: 'Ana Kovačević', adminRole: 'admin', adminOrganizationId: 1,
    region: { regionId: 1, name: 'Žabljak', type: 'city', lat: 43.1556, lng: 19.1225, country: 'Montenegro' },
  },
  {
    postId: 7, adminId: 4, regionId: 5,
    title: 'Club Aquarius Budva', postType: 'club',
    description: 'Najpopularniji beach club na Crnogorskom primorju.',
    lat: 42.2820, lng: 18.8390, address: 'Slovenska plaža, Budva',
    externalUrl: null, externalUrlLabel: null,
    images: ['/images/posts/aquarius1.jpg'], openingHours: { fri: '22:00-06:00', sat: '22:00-06:00' },
    details: { capacity: 1500, entryFee: 10, currency: 'EUR' },
    status: 'published', viewCount: 2, likeCount: 2, saveCount: 2,
    reviewCount: 0, avgRating: null, publishedAt: '2024-05-01T12:00:00',
    createdAt: '2024-05-01T12:00:00', updatedAt: '2024-05-01T12:00:00',
    adminName: 'Jovana Milić', adminRole: 'admin', adminOrganizationId: 3,
    region: { regionId: 5, name: 'Budva', type: 'city', lat: 42.2864, lng: 18.8400, country: 'Montenegro' },
  },
  {
    postId: 8, adminId: 6, regionId: 2,
    title: 'Ski centar Savin Kuk', postType: 'sports_facility',
    description: 'Skijalište na 2313m nadmorske visine. 4 žičare, 12 staza.',
    lat: 43.1789, lng: 19.0456, address: 'Savin Kuk, NP Durmitor',
    externalUrl: null, externalUrlLabel: null,
    images: ['/images/posts/savinkuk1.jpg'], openingHours: { mon: '09:00-16:00' },
    details: { lifts: 4, slopes: 12, totalKm: 18, skiSchool: true, dayPass: 25, currency: 'EUR' },
    status: 'published', viewCount: 3, likeCount: 3, saveCount: 1,
    reviewCount: 2, avgRating: 4.5, publishedAt: '2024-11-01T08:00:00',
    createdAt: '2024-11-01T08:00:00', updatedAt: '2024-11-01T08:00:00',
    adminName: 'Petar Vuković', adminRole: 'admin', adminOrganizationId: null,
    region: { regionId: 2, name: 'Durmitor', type: 'national_park', lat: 43.1500, lng: 19.0167, country: 'Montenegro' },
  },
];

// Admin (id=2, Ana) owns posts 3 and 6
const ADMIN_POST_IDS = new Set([3, 6]);

// ── Routes ────────────────────────────────────────────────────────────────
const ROUTES = [
  {
    routeId: 1, adminId: 3, regionId: 2,
    name: 'Staza oko Crnog jezera', difficulty: 'easy',
    distanceKm: 3.6, durationMin: 60, elevationGainM: 30,
    description: 'Kružna staza oko Crnog jezera. Idealna za početnike i porodice.',
    waypoints: [
      { lat: 43.1378, lng: 19.0644, name: 'Ulaz — parking' },
      { lat: 43.1420, lng: 19.0610, name: 'Vidikovac' },
      { lat: 43.1378, lng: 19.0644, name: 'Povratak — parking' },
    ],
    gpxFilePath: null, images: [], status: 'published',
    viewCount: 0, saveCount: 4, createdAt: '2024-02-01', updatedAt: '2024-02-01',
    adminName: 'Nikola Đurić',
    region: { regionId: 2, name: 'Durmitor', lat: 43.1500, lng: 19.0167 },
  },
  {
    routeId: 2, adminId: 6, regionId: 2,
    name: 'Vrh Bobotov Kuk', difficulty: 'hard',
    distanceKm: 14.0, durationMin: 360, elevationGainM: 900,
    description: 'Najzahtjevnija tura na najviši vrh Durmitora (2523m).',
    waypoints: [
      { lat: 43.1378, lng: 19.0644, name: 'Polazište — Crno jezero' },
      { lat: 43.1550, lng: 19.0300, name: 'Vrh Bobotov Kuk 2523m' },
    ],
    gpxFilePath: null, images: [], status: 'published',
    viewCount: 0, saveCount: 2, createdAt: '2024-02-10', updatedAt: '2024-02-10',
    adminName: 'Petar Vuković',
    region: { regionId: 2, name: 'Durmitor', lat: 43.1500, lng: 19.0167 },
  },
  {
    routeId: 3, adminId: 3, regionId: 4,
    name: 'Kanjon Tare — pješačka staza', difficulty: 'moderate',
    distanceKm: 8.5, durationMin: 180, elevationGainM: 420,
    description: 'Staza duž kanjona rijeke Tare.',
    waypoints: [
      { lat: 43.2000, lng: 19.2500, name: 'Polazište' },
      { lat: 43.2300, lng: 19.2200, name: 'Vidikovac nad kanjonom' },
    ],
    gpxFilePath: null, images: [], status: 'published',
    viewCount: 0, saveCount: 1, createdAt: '2024-02-15', updatedAt: '2024-02-15',
    adminName: 'Nikola Đurić',
    region: { regionId: 4, name: 'Tara kanjon', lat: 43.2000, lng: 19.2500 },
  },
];

// ── Reviews (v_reviews_full) ──────────────────────────────────────────────
const REVIEWS = [
  { reviewId: 1, touristId: 1, postId: 5, routeId: null, rating: 5, comment: 'Nevjerovatno lijepo!', status: 'APPROVED', createdAt: '2024-06-01', touristName: 'Emma Wilson', entityType: 'OBJECT', entityName: 'Crno jezero', postType: 'attraction' },
  { reviewId: 2, touristId: 2, postId: 5, routeId: null, rating: 4, comment: 'Preljepo, ali malo previše turista.', status: 'APPROVED', createdAt: '2024-06-05', touristName: 'Luca Rossi', entityType: 'OBJECT', entityName: 'Crno jezero', postType: 'attraction' },
  { reviewId: 3, touristId: 3, postId: 1, routeId: null, rating: 5, comment: 'Odličan hotel, predivna lokacija.', status: 'APPROVED', createdAt: '2024-06-08', touristName: 'Jana Novák', entityType: 'OBJECT', entityName: 'Hotel Jezera Žabljak', postType: 'accommodation' },
  { reviewId: 4, touristId: 4, postId: 3, routeId: null, rating: 4, comment: 'Zanimljiv muzej sa dobrom zbirkom.', status: 'APPROVED', createdAt: '2024-06-10', touristName: 'Aleksandra P.', entityType: 'OBJECT', entityName: 'Muzej Žabljaka', postType: 'cultural_site' },
  { reviewId: 5, touristId: 1, postId: 6, routeId: null, rating: 4, comment: 'Lijepi apartmani, čisti i dobro opremljeni.', status: 'APPROVED', createdAt: '2024-06-12', touristName: 'Emma Wilson', entityType: 'OBJECT', entityName: 'Apartmani Durmitor', postType: 'accommodation' },
  { reviewId: 6, touristId: 5, postId: 8, routeId: null, rating: 5, comment: 'Savin Kuk je fantastičan ski centar!', status: 'APPROVED', createdAt: '2024-12-15', touristName: 'Thomas Müller', entityType: 'OBJECT', entityName: 'Ski centar Savin Kuk', postType: 'sports_facility' },
  { reviewId: 7, touristId: 2, postId: 4, routeId: null, rating: 5, comment: 'Festival je bio odličan!', status: 'APPROVED', createdAt: '2025-07-21', touristName: 'Luca Rossi', entityType: 'EVENT', entityName: 'Durmitor Summer Fest', postType: 'event' },
  { reviewId: 8, touristId: 3, postId: 8, routeId: null, rating: 4, comment: 'Dobro skijalište, ali gužve vikendom.', status: 'APPROVED', createdAt: '2025-01-10', touristName: 'Jana Novák', entityType: 'OBJECT', entityName: 'Ski centar Savin Kuk', postType: 'sports_facility' },
  { reviewId: 9, touristId: 1, postId: null, routeId: 1, rating: 5, comment: 'Prekrasna staza!', status: 'APPROVED', createdAt: '2024-07-01', touristName: 'Emma Wilson', entityType: 'ROUTE', entityName: 'Staza oko Crnog jezera', postType: null },
  { reviewId: 10, touristId: 5, postId: null, routeId: 2, rating: 4, comment: 'Teška tura ali vrijedna svake kapi znoja.', status: 'PENDING', createdAt: '2025-02-01', touristName: 'Thomas Müller', entityType: 'ROUTE', entityName: 'Vrh Bobotov Kuk', postType: null },
  { reviewId: 11, touristId: 2, postId: 7, routeId: null, rating: 2, comment: 'Previše buke, nisam mogla spavati.', status: 'PENDING', createdAt: '2025-05-01', touristName: 'Luca Rossi', entityType: 'OBJECT', entityName: 'Club Aquarius Budva', postType: 'club' },
];

const ADMIN_REVIEW_POST_IDS = new Set([3, 6]);

// ── Admin users (v_admin_users_full) — roles: 'superadmin' | 'admin' ─────
const ADMIN_USERS = [
  { userId: 1, organizationId: null, fullName: 'Marko Petrović', email: 'superadmin@touristhub.me', emailVerifiedAt: '2024-01-01', role: 'superadmin', isIndividual: true, accountStatus: 'active', createdAt: '2024-01-01', organization: null, isActive: true, permissionCount: 0 },
  { userId: 2, organizationId: 1, fullName: 'Ana Kovačević', email: 'ana.kovacevic@zabljak.travel', emailVerifiedAt: '2024-01-15', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-15', organization: { organizationId: 1, name: 'TuristOrg Žabljak', type: 'municipality', contactEmail: 'info@zabljak.travel', website: 'https://zabljak.travel', isVerified: true }, isActive: true, permissionCount: 7 },
  { userId: 3, organizationId: 2, fullName: 'Nikola Đurić', email: 'nikola.djuric@npdurmitor.me', emailVerifiedAt: '2024-01-16', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-16', organization: { organizationId: 2, name: 'NP Durmitor', type: 'municipality', contactEmail: 'info@npdurmitor.me', website: 'https://npdurmitor.me', isVerified: true }, isActive: true, permissionCount: 5 },
  { userId: 4, organizationId: 3, fullName: 'Jovana Milić', email: 'jovana.milic@mnadv.me', emailVerifiedAt: '2024-01-17', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-17', organization: { organizationId: 3, name: 'Montenegro Adventures', type: 'tourist_agency', contactEmail: 'hello@mnadv.me', website: 'https://montenegroadv.me', isVerified: true }, isActive: true, permissionCount: 5 },
  { userId: 5, organizationId: 4, fullName: 'Stefan Radović', email: 'stefan.radovic@hoteljezera.me', emailVerifiedAt: '2024-01-18', role: 'admin', isIndividual: false, accountStatus: 'active', createdAt: '2024-01-18', organization: { organizationId: 4, name: 'Hotel Jezera Žabljak', type: 'hotel_chain', contactEmail: 'rezervacije@jezera.me', website: 'https://hoteljezera.me', isVerified: true }, isActive: true, permissionCount: 4 },
  { userId: 6, organizationId: null, fullName: 'Petar Vuković', email: 'petar.vukovic@gmail.com', emailVerifiedAt: '2024-01-19', role: 'admin', isIndividual: true, accountStatus: 'suspended', createdAt: '2024-01-19', organization: null, isActive: false, permissionCount: 3 },
];

// ── Permissions ───────────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  { id: 1, code: 'create_accommodation', label: 'Kreiranje smještaja', category: 'content', description: 'Dodavanje hotela, apartmana...' },
  { id: 2, code: 'create_restaurant', label: 'Kreiranje restorana', category: 'content', description: 'Dodavanje restorana i kafića' },
  { id: 3, code: 'create_club', label: 'Kreiranje klubova', category: 'content', description: 'Dodavanje noćnih klubova' },
  { id: 4, code: 'create_event', label: 'Kreiranje dogadjaja', category: 'content', description: 'Dodavanje koncerata, tura' },
  { id: 5, code: 'create_route', label: 'Kreiranje ruta', category: 'content', description: 'Dodavanje ruta' },
  { id: 6, code: 'create_cultural_site', label: 'Kreiranje kulturnih mjesta', category: 'content', description: 'Dodavanje muzeja, galerija' },
  { id: 7, code: 'create_monument', label: 'Kreiranje spomenika', category: 'content', description: 'Dodavanje istorijskih mjesta' },
  { id: 8, code: 'create_sports', label: 'Kreiranje sportskih obj.', category: 'content', description: 'Dodavanje sportskih terena' },
  { id: 9, code: 'create_shop', label: 'Kreiranje prodavnica', category: 'content', description: 'Dodavanje prodavnica' },
  { id: 10, code: 'manage_reviews', label: 'Upravljanje recenzijama', category: 'content', description: 'Moderacija recenzija' },
  { id: 11, code: 'view_analytics', label: 'Pregled analitike', category: 'analytics', description: 'Pregled statistika' },
  { id: 12, code: 'manage_own_posts', label: 'Upravljanje vlastitim obj.', category: 'content', description: 'Editovanje vlastitih objava' },
  { id: 13, code: 'manage_tags', label: 'Upravljanje tagovima', category: 'content', description: 'Dodavanje i uredjivanje tagova' },
  { id: 14, code: 'manage_translations', label: 'Upravljanje prijevodima', category: 'content', description: 'Dodavanje prijevoda' },
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

// ── Registration Requests (admin_registration_request) ────────────────────
const REGISTRATION_REQUESTS = [
  {
    id: 1, fullName: 'Milica Stanković', email: 'milica.s@gmail.com',
    isIndividual: true, organizationName: null, organizationEmail: null,
    emailVerifiedAt: '2024-06-01T12:00:00',
    status: 'pending', rejectionReason: null,
    submittedAt: '2024-06-01T10:00:00', reviewedAt: null, reviewedBy: null,
    documentUrl: '/documents/milica_licna.pdf',
  },
  {
    id: 2, fullName: 'Boris Nikolić', email: 'boris@adventureme.com',
    isIndividual: false, organizationName: 'Adventure Montenegro', organizationEmail: 'info@adventureme.com',
    emailVerifiedAt: null,
    status: 'pending', rejectionReason: null,
    submittedAt: '2024-06-02T09:30:00', reviewedAt: null, reviewedBy: null,
    documentUrl: null,
  },
  {
    id: 3, fullName: 'Sanja Đokić', email: 'sanja.djokic@kotor.travel',
    isIndividual: false, organizationName: 'Kotor Tours', organizationEmail: 'info@kotor.travel',
    emailVerifiedAt: '2024-05-20T08:00:00',
    status: 'approved', rejectionReason: null,
    submittedAt: '2024-05-19T14:00:00', reviewedAt: '2024-05-21T10:00:00', reviewedBy: 1,
    documentUrl: '/documents/kotor_tours_reg.pdf',
  },
  {
    id: 4, fullName: 'Dragan Vukić', email: 'dragan.v@gmail.com',
    isIndividual: true, organizationName: null, organizationEmail: null,
    emailVerifiedAt: null,
    status: 'rejected', rejectionReason: 'Email nije verifikovan u predvidjenom roku.',
    submittedAt: '2024-05-10T11:00:00', reviewedAt: '2024-05-17T09:00:00', reviewedBy: 1,
    documentUrl: null,
  },
];

// ── Notifications ─────────────────────────────────────────────────────────
const ADMIN_NOTIFICATIONS: Record<number, any[]> = {
  1: [
    { id: 1, adminUserId: 1, type: 'new_registration', title: 'Novi zahtjev za registraciju', body: 'Milica Stanković čeka odobrenje naloga.', payload: { registration_id: 1, url: '/admin/zahtevi' }, isRead: false, createdAt: '2024-06-01T10:00:00' },
    { id: 2, adminUserId: 1, type: 'pending_review', title: 'Nova recenzija čeka moderaciju', body: 'Turist je ostavio recenziju za Hotel Jezera.', payload: { review_id: 1, post_id: 1, url: '/admin/reviews' }, isRead: false, createdAt: '2024-06-02T09:00:00' },
    { id: 3, adminUserId: 1, type: 'pending_review', title: 'Negativna recenzija', body: 'Recenzija sa ocjenom 2/5 za Club Aquarius.', payload: { review_id: 11, post_id: 7, url: '/admin/reviews' }, isRead: true, createdAt: '2025-05-01T08:00:00' },
  ],
  2: [
    { id: 4, adminUserId: 2, type: 'post_approved', title: 'Muzej Žabljaka odobren', body: 'Vaša objava "Muzej Žabljaka" je odobrena.', payload: { post_id: 3, url: '/admin/lokacije' }, isRead: false, createdAt: '2024-03-09T11:00:00' },
    { id: 5, adminUserId: 2, type: 'system', title: 'Dobrodošli na platformu', body: 'Vaš nalog je aktivan.', payload: { url: '/admin/dashboard' }, isRead: true, createdAt: '2024-01-15T10:00:00' },
  ],
};

// ── Dashboard stats (v_superadmin_overview) ───────────────────────────────
const SUPERADMIN_STATS = {
  totalTourists: 5, totalAdmins: 5, totalPosts: 8, totalRoutes: 3,
  pendingRegistrations: 2, pendingReviews: 2, ticketsIssued: 3, unreadNotifications: 2,
};

const ADMIN_STATS = {
  totalTourists: 0, totalAdmins: 0, totalPosts: 2, totalRoutes: 0,
  pendingRegistrations: 0, pendingReviews: 1, ticketsIssued: 0, unreadNotifications: 1,
};

// ── Region popularity ─────────────────────────────────────────────────────
const REGION_POPULARITY = [
  { regionId: 1, name: 'Žabljak', type: 'city', numPosts: 5, totalViews: 9, totalLikes: 9, avgRating: 4.3 },
  { regionId: 2, name: 'Durmitor', type: 'national_park', numPosts: 1, totalViews: 3, totalLikes: 3, avgRating: 4.5 },
  { regionId: 3, name: 'Crno jezero', type: 'lake', numPosts: 1, totalViews: 5, totalLikes: 5, avgRating: 4.5 },
  { regionId: 4, name: 'Tara kanjon', type: 'national_park', numPosts: 0, totalViews: 0, totalLikes: 0, avgRating: null },
  { regionId: 5, name: 'Budva', type: 'city', numPosts: 1, totalViews: 2, totalLikes: 2, avgRating: null },
];

// ── Tourist movements ─────────────────────────────────────────────────────
const MOVEMENTS = [
  { regionId: 1, regionName: 'Žabljak', latitude: 43.1556, longitude: 19.1225, visitCount: 9 },
  { regionId: 3, regionName: 'Crno jezero', latitude: 43.1378, longitude: 19.0644, visitCount: 5 },
  { regionId: 2, regionName: 'Durmitor', latitude: 43.1500, longitude: 19.0167, visitCount: 3 },
  { regionId: 5, regionName: 'Budva', latitude: 42.2864, longitude: 18.8400, visitCount: 2 },
];

// ── Daily visits ──────────────────────────────────────────────────────────
const DAILY_VISITS = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  count: Math.floor(Math.random() * 12 + 2),
}));

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function paginate<T>(data: T[], page = 1, pageSize = 10) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { data: data.slice(start, start + pageSize), total, page, pageSize, totalPages };
}

function ok(body: unknown) {
  return of(new HttpResponse({ status: 200, body }));
}

function currentUser(): { userId: number; role: string } | null {
  try {
    const raw = localStorage.getItem('tg_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERCEPTOR
// ─────────────────────────────────────────────────────────────────────────────

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  const params = req.params;
  const user = currentUser();

  // DB roles: 'superadmin' | 'admin'
  const isSuperAdmin = user?.role === 'superadmin';
  const userId = user?.userId ?? 0;

  const page = +(params.get('page') ?? 1);
  const pageSize = +(params.get('pageSize') ?? 10);

  // ── Analytics ────────────────────────────────────────────────────────────
  if (url.includes('/analytics/stats')) {
    return ok({ data: isSuperAdmin ? SUPERADMIN_STATS : ADMIN_STATS, success: true });
  }
  if (url.includes('/analytics/visits')) {
    return ok({ data: DAILY_VISITS, success: true });
  }
  if (url.includes('/analytics/popular/posts')) {
    const list = isSuperAdmin
      ? POSTS.filter(p => p.postType !== 'event').sort((a, b) => b.viewCount - a.viewCount).slice(0, 5)
      : POSTS.filter(p => ADMIN_POST_IDS.has(p.postId) && p.postType !== 'event');
    return ok({ data: list.map(p => ({ id: p.postId, title: p.title, postType: p.postType, viewCount: p.viewCount, likeCount: p.likeCount, avgRating: p.avgRating, regionName: p.region?.name ?? null, adminName: p.adminName })), success: true });
  }
  if (url.includes('/analytics/popular/events')) {
    const list = POSTS.filter(p => p.postType === 'event').sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
    return ok({ data: list.map(p => ({ id: p.postId, title: p.title, postType: p.postType, viewCount: p.viewCount, likeCount: p.likeCount, avgRating: p.avgRating, regionName: p.region?.name ?? null, adminName: p.adminName })), success: true });
  }
  if (url.includes('/analytics/regions')) {
    return ok({ data: REGION_POPULARITY, success: true });
  }
  if (url.includes('/analytics/movements')) {
    return ok({ data: MOVEMENTS, success: true });
  }

  // ── Posts ─────────────────────────────────────────────────────────────────
  if (url.includes('/posts') && req.method === 'GET' && !url.match(/\/posts\/\d+/)) {
    let list = [...POSTS];
    if (!isSuperAdmin) list = list.filter(p => ADMIN_POST_IDS.has(p.postId));
    const types = params.getAll('postType') ?? [];
    if (types.length) list = list.filter(p => types.includes(p.postType));
    const rid = params.get('regionId');
    if (rid) list = list.filter(p => p.regionId === +rid);
    const status = params.get('status');
    if (status) list = list.filter(p => p.status === status);
    const q = params.get('search');
    if (q) list = list.filter(p => p.title.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/posts\/(\d+)$/) && req.method === 'GET') {
    const id = +url.split('/').pop()!;
    const post = POSTS.find(p => p.postId === id);
    return ok({ data: post ?? null, success: true });
  }

  // ── Regions ───────────────────────────────────────────────────────────────
  if (url.includes('/regions') && req.method === 'GET' && !url.match(/\/regions\/\d+/)) {
    let list = [...REGIONS];
    const q = params.get('search');
    if (q) list = list.filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/regions\/(\d+)$/) && req.method === 'GET') {
    const id = +url.split('/').pop()!;
    return ok({ data: REGIONS.find(r => r.regionId === id) ?? null, success: true });
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  if (url.includes('/routes') && req.method === 'GET' && !url.match(/\/routes\/\d+/)) {
    let list = [...ROUTES];
    const q = params.get('search');
    if (q) list = list.filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/routes\/(\d+)$/) && req.method === 'GET') {
    const id = +url.split('/').pop()!;
    return ok({ data: ROUTES.find(r => r.routeId === id) ?? null, success: true });
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  if (url.includes('/reviews') && req.method === 'GET' && !url.match(/\/reviews\/\d+/)) {
    let list = [...REVIEWS];
    if (!isSuperAdmin) {
      list = list.filter(r =>
        (r.postId && ADMIN_REVIEW_POST_IDS.has(r.postId)) || r.status === 'PENDING'
      );
    }
    const status = params.get('status');
    if (status) list = list.filter(r => r.status === status);
    const entityType = params.get('entityType');
    if (entityType) list = list.filter(r => r.entityType === entityType);
    const minRating = params.get('minRating');
    if (minRating) list = list.filter(r => r.rating >= +minRating);
    const maxRating = params.get('maxRating');
    if (maxRating) list = list.filter(r => r.rating <= +maxRating);
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/reviews\/(\d+)\/status$/) && req.method === 'PATCH') {
    return ok({ data: null, success: true });
  }
  if (url.match(/\/reviews\/(\d+)$/) && req.method === 'DELETE') {
    // Only superadmin can delete reviews — enforced in component too
    return ok({ data: null, success: true });
  }

  // ── Admin users ───────────────────────────────────────────────────────────
  if (url.includes('/admin-users') && req.method === 'GET' && !url.match(/\/admin-users\/\d+/)) {
    if (!isSuperAdmin) return ok(paginate([], page, pageSize));
    let list = [...ADMIN_USERS];
    const role = params.get('role');
    if (role) list = list.filter(u => u.role === role);
    const accountStatus = params.get('accountStatus');
    if (accountStatus) list = list.filter(u => u.accountStatus === accountStatus);
    const q = params.get('search');
    if (q) list = list.filter(u => u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/admin-users\/(\d+)$/) && req.method === 'GET') {
    const id = +url.split('/').pop()!;
    return ok({ data: ADMIN_USERS.find(u => u.userId === id) ?? null, success: true });
  }
  if (url.match(/\/admin-users\/(\d+)\/permissions$/) && req.method === 'GET') {
    const data = userId === 2 ? ANA_PERMISSIONS : [];
    return ok({ data, success: true });
  }

  // ── Permissions catalogue ─────────────────────────────────────────────────
  if (url.includes('/permissions') && req.method === 'GET' && !url.includes('/admin-users')) {
    return ok({ data: ALL_PERMISSIONS, success: true });
  }

  // ── Roles ─────────────────────────────────────────────────────────────────
  if (url.endsWith('/roles') && req.method === 'GET') {
    return ok({
      data: [
        { roleId: 1, roleName: 'superadmin', description: 'Pun pristup svim funkcijama platforme' },
        { roleId: 2, roleName: 'admin', description: 'Pristup ograničen dodeljenim dozvolama' },
      ], success: true,
    });
  }

  // ── Organizations ─────────────────────────────────────────────────────────
  if (url.includes('/organizations') && req.method === 'GET') {
    return ok({
      data: [
        { organizationId: 1, name: 'Turistička organizacija Žabljak', type: 'municipality', contactEmail: 'info@zabljak.travel', website: 'https://zabljak.travel', isVerified: true },
        { organizationId: 2, name: 'NP Durmitor', type: 'municipality', contactEmail: 'info@npdurmitor.me', website: 'https://npdurmitor.me', isVerified: true },
        { organizationId: 3, name: 'Montenegro Adventures d.o.o.', type: 'tourist_agency', contactEmail: 'hello@mnadv.me', website: 'https://montenegroadv.me', isVerified: true },
        { organizationId: 4, name: 'Hotel Jezera Žabljak', type: 'hotel_chain', contactEmail: 'rezervacije@jezera.me', website: 'https://hoteljezera.me', isVerified: true },
      ], success: true,
    });
  }

  // ── Registration Requests (zahtevi) ───────────────────────────────────────
  if (url.includes('/registrations') && req.method === 'GET' && !url.match(/\/registrations\/\d+/)) {
    if (!isSuperAdmin) return ok(paginate([], page, pageSize));
    const status = params.get('status');
    let list = [...REGISTRATION_REQUESTS];
    if (status) list = list.filter(r => r.status === status);
    return ok(paginate(list, page, pageSize));
  }
  if (url.match(/\/registrations\/\d+\/(approve|reject)$/) && req.method === 'PATCH') {
    return ok({ data: null, success: true });
  }

  // ── Admin notifications ───────────────────────────────────────────────────
  if (url.includes('/admin-notifications') && req.method === 'GET') {
    const notifs = ADMIN_NOTIFICATIONS[userId] ?? [];
    return ok({ data: notifs, success: true });
  }
  if (url.match(/\/admin-notifications\/\d+\/read$/) && req.method === 'PATCH') {
    return ok({ data: null, success: true });
  }
  if (url.includes('/admin-notifications/read-all') && req.method === 'PATCH') {
    return ok({ data: null, success: true });
  }

  // ── Write operations ──────────────────────────────────────────────────────
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return ok({ data: null, success: true, message: 'Mock: operacija uspješna.' });
  }

  // ── Pass through (map tiles, CDN, etc.) ───────────────────────────────────
  return next(req);
};
