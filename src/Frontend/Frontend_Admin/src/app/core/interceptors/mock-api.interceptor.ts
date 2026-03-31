import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

const OBJECTS = [
  { objectId: 1, destinationId: 1, name: 'Hotel Kopaonik Star', category: 'HOTEL', description: 'Luksuzni planinski resort sa 120 soba i wellnes centrom.', address: 'Kopaonik b.b., 36354', latitude: 43.2891, longitude: 20.7854, phone: '+381 36 547 000', website: 'https://kopaonikstar.rs', workingHours: '0–24h', averageRating: 4.9, reviewCount: 1240, destination: { destinationId: 1, name: 'Kopaonik' }, activities: [{ activityId: 1, name: 'Ski', category: 'SPORT' }, { activityId: 2, name: 'Wellness', category: 'WELLNESS' }], media: [] },
  { objectId: 2, destinationId: 2, name: 'Tvrdjava Golubac', category: 'CULTURAL', description: 'Srednjovekovna tvrdjava na Dunavu, turističko mesto.', address: 'Golubac bb, 12223', latitude: 44.6547, longitude: 21.6278, phone: '', website: '', workingHours: '08:00–20:00', averageRating: 4.8, reviewCount: 3502, destination: { destinationId: 2, name: 'Golubac' }, activities: [{ activityId: 3, name: 'Fotografija', category: 'CULTURE' }], media: [] },
  { objectId: 3, destinationId: 3, name: 'Spa & Wellness Vrnjci', category: 'SPORT', description: 'Termalni centar, banjsko lečenje i masaže.', address: 'Vrnjačka Banja, 36210', latitude: 43.6247, longitude: 20.8961, phone: '+381 36 612 200', website: 'https://vrnjci.rs', workingHours: '07:00–22:00', averageRating: 4.6, reviewCount: 890, destination: { destinationId: 3, name: 'Vrnjačka Banja' }, activities: [{ activityId: 4, name: 'Masaža', category: 'WELLNESS' }], media: [] },
  { objectId: 4, destinationId: 4, name: 'Restoran Šumadija', category: 'RESTAURANT', description: 'Tradicionalna srpska kuhinja u srcu Kragujevca.', address: 'Kneza Miloša 12, 34000', latitude: 44.0128, longitude: 20.9114, phone: '+381 34 301 200', website: '', workingHours: '10:00–23:00', averageRating: 4.4, reviewCount: 340, destination: { destinationId: 4, name: 'Kragujevac' }, activities: [], media: [] },
  { objectId: 5, destinationId: 5, name: 'SC Novak Beograd', category: 'SPORT', description: 'Profesionalni sportski centar, tenis i fitness.', address: 'Bulevar A.C. 59, 11000', latitude: 44.8252, longitude: 20.4501, phone: '+381 11 228 8228', website: 'https://scnovak.rs', workingHours: '07:00–22:00', averageRating: 4.7, reviewCount: 2100, destination: { destinationId: 5, name: 'Beograd' }, activities: [{ activityId: 5, name: 'Tenis', category: 'SPORT' }, { activityId: 6, name: 'Fitnes', category: 'SPORT' }], media: [] },
  { objectId: 6, destinationId: 5, name: 'Narodno pozorište Beograd', category: 'CULTURAL', description: 'Istorijsko pozorište u centru Beograda od 1869. godine.', address: 'Trg republike 1, 11000', latitude: 44.8152, longitude: 20.4614, phone: '+381 11 332 6000', website: 'https://narodnopozoriste.rs', workingHours: 'Po rasporedu', averageRating: 4.7, reviewCount: 4120, destination: { destinationId: 5, name: 'Beograd' }, activities: [], media: [] },
];

// Subset for ORG admin (organizationId: 1) — only objects 1 and 3
const ORG_OBJECT_IDS = new Set([1, 3]);

const EVENTS = [
  { eventId: 1, destinationId: 5, objectId: null, organizationId: null, name: 'Exit Festival 2026', category: 'FESTIVAL', description: 'Najveći muzički festival u regionu.', startAt: '2026-07-10T20:00:00', endAt: '2026-07-14T06:00:00', ticketUrl: 'https://exitfest.org', latitude: 45.2513, longitude: 19.8519, createdBy: 1, createdAt: '2026-03-01T10:00:00', destination: { destinationId: 5, name: 'Novi Sad' } },
  { eventId: 2, destinationId: 4, objectId: 3, organizationId: 1, name: 'Jazz večer — Vrnjci', category: 'CONCERT', description: 'Jazz nastup u hotelu Vrnjci.', startAt: '2026-04-20T20:00:00', endAt: '2026-04-20T23:00:00', ticketUrl: null, latitude: null, longitude: null, createdBy: 2, createdAt: '2026-03-10T09:00:00', destination: { destinationId: 3, name: 'Vrnjačka Banja' } },
  { eventId: 3, destinationId: 1, objectId: 1, organizationId: 1, name: 'Ski opening Kopaonik 2026', category: 'SPORT', description: 'Otvaranje ski sezone na Kopaoniku.', startAt: '2026-12-01T10:00:00', endAt: '2026-12-01T18:00:00', ticketUrl: null, latitude: null, longitude: null, createdBy: 2, createdAt: '2026-03-15T08:00:00', destination: { destinationId: 1, name: 'Kopaonik' } },
  { eventId: 4, destinationId: 5, objectId: 6, organizationId: null, name: 'Hamlet — Narodno pozorište', category: 'THEATER', description: 'Premijera Hamleta u izvedbi ansambla.', startAt: '2026-04-25T19:30:00', endAt: '2026-04-25T22:00:00', ticketUrl: 'https://narodnopozoriste.rs', latitude: null, longitude: null, createdBy: 1, createdAt: '2026-02-20T12:00:00', destination: { destinationId: 5, name: 'Beograd' } },
  { eventId: 5, destinationId: 5, objectId: 5, organizationId: null, name: 'Teniski turnir Beograd Open', category: 'SPORT', description: 'Godišnji otvoreni teniski turnir.', startAt: '2026-05-10T09:00:00', endAt: '2026-05-15T18:00:00', ticketUrl: 'https://scnovak.rs/turnir', latitude: null, longitude: null, createdBy: 1, createdAt: '2026-02-28T10:00:00', destination: { destinationId: 5, name: 'Beograd' } },
];

const ORG_EVENT_IDS = new Set([2, 3]);

const ACTIVITIES = [
  { activityId: 1, name: 'Planinarska tura — Rtanj', category: 'ADVENTURE', description: 'Vodič: PD Vrh · 6–8 sati · težak teren' },
  { activityId: 2, name: 'Ski Kopaonik', category: 'SPORT', description: 'Profesionalna ski staza · sve uzraste' },
  { activityId: 3, name: 'Spa & Masaža Vrnjci', category: 'WELLNESS', description: '60 min · kozmetika i relaksacija' },
  { activityId: 4, name: 'Teniski kamp 2026', category: 'SPORT', description: 'SC Novak · 5 dana · sertifikat' },
  { activityId: 5, name: 'Shopping tura Knez Mihailova', category: 'SHOPPING', description: 'Vođena šoping tura · 3 sata' },
  { activityId: 6, name: 'Plivanje — Olimpijski bazen', category: 'SPORT', description: 'SC Vojvodina · sve uzraste' },
];

const REVIEWS = [
  { reviewId: 1, userId: 10, objectId: 1, eventId: null, routeId: null, rating: 5, comment: 'Odličan hotel, preporučujem svima!', createdAt: '2026-03-25T10:00:00', status: 'PENDING', user: { userId: 10, fullName: 'Milica Kovačević' }, entityName: 'Hotel Kopaonik Star', entityType: 'OBJECT' },
  { reviewId: 2, userId: 11, objectId: null, eventId: null, routeId: null, rating: 4, comment: 'Lepa tura, vodič je bio odličan.', createdAt: '2026-03-20T14:00:00', status: 'APPROVED', user: { userId: 11, fullName: 'Jovan Petrović' }, entityName: 'Planinarska tura Rtanj', entityType: 'OBJECT' },
  { reviewId: 3, userId: 12, objectId: null, eventId: 1, routeId: null, rating: 2, comment: 'Razočarana organizacijom, redovi su bili dugi.', createdAt: '2026-03-18T09:00:00', status: 'PENDING', user: { userId: 12, fullName: 'Ana Tomić' }, entityName: 'Exit Festival 2026', entityType: 'EVENT' },
  { reviewId: 4, userId: 13, objectId: 6, eventId: null, routeId: null, rating: 5, comment: 'Nezaboravno iskustvo, sala je bila divna.', createdAt: '2026-03-15T18:00:00', status: 'APPROVED', user: { userId: 13, fullName: 'Marko Nikolić' }, entityName: 'Narodno pozorište', entityType: 'OBJECT' },
  { reviewId: 5, userId: 14, objectId: 3, eventId: null, routeId: null, rating: 5, comment: 'Spa centar je fantastičan, opuštajuće.', createdAt: '2026-03-10T11:00:00', status: 'APPROVED', user: { userId: 14, fullName: 'Jelena Marić' }, entityName: 'Spa & Wellness Vrnjci', entityType: 'OBJECT' },
];

const ORG_REVIEW_IDS = new Set([1, 5]); // reviews for org's objects

const USERS = [
  { userId: 1, roleId: 1, organizationId: null, fullName: 'Marko Super', email: 'superadmin@touristhub.rs', isActive: true, createdAt: '2026-01-01T00:00:00', role: { roleId: 1, roleName: 'ADMIN', description: 'Super Administrator' }, organization: null },
  { userId: 2, roleId: 2, organizationId: 1, fullName: 'Ana Petrović', email: 'admin@kopaonik.rs', isActive: true, createdAt: '2026-01-15T08:00:00', role: { roleId: 2, roleName: 'ORG', description: 'Organizacija / Admin' }, organization: { organizationId: 1, name: 'Kopaonik Resort d.o.o.', description: '', contactEmail: 'admin@kopaonik.rs', phone: '', website: '' } },
  { userId: 3, roleId: 2, organizationId: 2, fullName: 'DraganKović', email: 'dragan@exitfest.org', isActive: true, createdAt: '2026-02-01T09:00:00', role: { roleId: 2, roleName: 'ORG', description: 'Organizacija / Admin' }, organization: { organizationId: 2, name: 'Exit Festival d.o.o.', description: '', contactEmail: '', phone: '', website: '' } },
  { userId: 4, roleId: 2, organizationId: 3, fullName: 'Ivana Pavlović', email: 'ivana@gmail.com', isActive: true, createdAt: '2026-02-10T10:00:00', role: { roleId: 2, roleName: 'ORG', description: 'Organizacija / Admin' }, organization: { organizationId: 3, name: 'Privatni apartman', description: '', contactEmail: '', phone: '', website: '' } },
  { userId: 5, roleId: 2, organizationId: 4, fullName: 'Stefan Radović', email: 'stefan@example.com', isActive: false, createdAt: '2026-03-05T11:00:00', role: { roleId: 2, roleName: 'ORG', description: 'Organizacija / Admin' }, organization: { organizationId: 4, name: 'Restoran Šumadija', description: '', contactEmail: '', phone: '', website: '' } },
];

const STATS = {
  totalDestinations: 12,
  totalObjects: 248,
  totalEvents: 37,
  totalRoutes: 19,
  totalUsers: 24,
  pendingReviews: 12,
};

const DAILY_VISITS = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  count: Math.floor(Math.random() * 200 + 80),
}));

const POPULAR_OBJECTS = OBJECTS.slice(0, 5).map((o, i) => ({
  id: o.objectId, name: o.name, category: o.category,
  viewCount: [8400, 6200, 5100, 4800, 3900][i],
  averageRating: o.averageRating,
}));

const POPULAR_EVENTS = EVENTS.slice(0, 5).map((e, i) => ({
  id: e.eventId, name: e.name, category: e.category,
  viewCount: [5200, 3800, 2900, 2100, 1600][i],
  averageRating: 4.5,
}));

const MOVEMENTS = [
  { destinationId: 1, destinationName: 'Kopaonik', latitude: 43.2891, longitude: 20.7854, visitCount: 3240 },
  { destinationId: 5, destinationName: 'Beograd', latitude: 44.8176, longitude: 20.4569, visitCount: 8921 },
  { destinationId: 3, destinationName: 'Vrnjačka Banja', latitude: 43.6247, longitude: 20.8961, visitCount: 1870 },
  { destinationId: 4, destinationName: 'Kragujevac', latitude: 44.0128, longitude: 20.9114, visitCount: 1240 },
  { destinationId: 2, destinationName: 'Golubac', latitude: 44.6547, longitude: 21.6278, visitCount: 980 },
];

const DESTINATIONS = [
  { destinationId: 1, name: 'Kopaonik', type: 'MOUNTAIN', description: 'Planinski resort.', city: 'Raška', region: 'Raška oblast', latitude: 43.2891, longitude: 20.7854, createdBy: 1, createdAt: '2026-01-01', objectCount: 24 },
  { destinationId: 2, name: 'Golubac', type: 'OTHER', description: 'Tvrdjava na Dunavu.', city: 'Golubac', region: 'Braničevski okr', latitude: 44.6547, longitude: 21.6278, createdBy: 1, createdAt: '2026-01-01', objectCount: 6 },
  { destinationId: 3, name: 'Vrnjačka Banja', type: 'OTHER', description: 'Banjsko lečilište.', city: 'Vrnjačka Banja', region: 'Raška oblast', latitude: 43.6247, longitude: 20.8961, createdBy: 1, createdAt: '2026-01-01', objectCount: 18 },
  { destinationId: 4, name: 'Kragujevac', type: 'CITY', description: 'Četvrti grad Srbije.', city: 'Kragujevac', region: 'Šumadija', latitude: 44.0128, longitude: 20.9114, createdBy: 1, createdAt: '2026-01-01', objectCount: 32 },
  { destinationId: 5, name: 'Beograd', type: 'CITY', description: 'Prestonica Srbije.', city: 'Beograd', region: 'Beogradski okr', latitude: 44.8176, longitude: 20.4569, createdBy: 1, createdAt: '2026-01-01', objectCount: 84 },
];

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

// ─────────────────────────────────────────────────────────────────────────────
// INTERCEPTOR
// ─────────────────────────────────────────────────────────────────────────────

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  const params = req.params;

  // Determine if caller is ORG admin (token present in localStorage)
  const rawUser = localStorage.getItem('tg_user');
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const isOrg = currentUser?.role === 'ORG';

  const page = +(params.get('page') ?? 1);
  const pageSize = +(params.get('pageSize') ?? 10);

  // ── Analytics ────────────────────────────────────────────────────────
  if (url.includes('/analytics/stats')) {
    const stats = isOrg
      ? { ...STATS, totalObjects: 2, totalEvents: 2, pendingReviews: 1 }
      : STATS;
    return ok({ data: stats, success: true });
  }

  if (url.includes('/analytics/visits')) {
    return ok({ data: DAILY_VISITS, success: true });
  }

  if (url.includes('/analytics/popular/objects')) {
    const data = isOrg
      ? POPULAR_OBJECTS.filter(o => ORG_OBJECT_IDS.has(o.id))
      : POPULAR_OBJECTS;
    return ok({ data, success: true });
  }

  if (url.includes('/analytics/popular/events')) {
    const data = isOrg
      ? POPULAR_EVENTS.filter(e => ORG_EVENT_IDS.has(e.id))
      : POPULAR_EVENTS;
    return ok({ data, success: true });
  }

  if (url.includes('/analytics/movements')) {
    return ok({ data: MOVEMENTS, success: true });
  }

  // ── Objects (lokacije) ────────────────────────────────────────────────
  if (url.includes('/objects') && req.method === 'GET' && !url.match(/\/objects\/\d+/)) {
    const list = isOrg
      ? OBJECTS.filter(o => ORG_OBJECT_IDS.has(o.objectId))
      : OBJECTS;
    return ok(paginate(list, page, pageSize));
  }

  if (url.match(/\/objects\/(\d+)$/) && req.method === 'GET') {
    const id = +url.split('/').pop()!;
    const obj = OBJECTS.find(o => o.objectId === id);
    return ok({ data: obj ?? null, success: true });
  }

  // ── Events ────────────────────────────────────────────────────────────
  if (url.includes('/events') && req.method === 'GET' && !url.match(/\/events\/\d+/)) {
    const list = isOrg
      ? EVENTS.filter(e => ORG_EVENT_IDS.has(e.eventId))
      : EVENTS;
    return ok(paginate(list, page, pageSize));
  }

  if (url.match(/\/events\/(\d+)$/) && req.method === 'GET') {
    const id = +url.split('/').pop()!;
    return ok({ data: EVENTS.find(e => e.eventId === id) ?? null, success: true });
  }

  // ── Activities ────────────────────────────────────────────────────────
  if (url.includes('/activities') && req.method === 'GET' && !url.match(/\/activities\/\d+/)) {
    return ok(paginate(ACTIVITIES, page, pageSize));
  }

  // ── Reviews ───────────────────────────────────────────────────────────
  if (url.includes('/reviews') && req.method === 'GET' && !url.match(/\/reviews\/\d+/)) {
    const list = isOrg
      ? REVIEWS.filter(r => ORG_REVIEW_IDS.has(r.reviewId))
      : REVIEWS;
    const status = params.get('status');
    const filtered = status ? list.filter(r => r.status === status) : list;
    return ok(paginate(filtered, page, pageSize));
  }

  if (url.match(/\/reviews\/(\d+)\/status$/) && req.method === 'PATCH') {
    return ok({ data: null, success: true });
  }

  // ── Users (superadmin only) ───────────────────────────────────────────
  if (url.includes('/users') && req.method === 'GET' && !url.match(/\/users\/\d+/)) {
    if (isOrg) return ok(paginate([], page, pageSize)); // ORG can't see users
    return ok(paginate(USERS, page, pageSize));
  }

  if (url.includes('/roles') && req.method === 'GET') {
    return ok({
      data: [
        { roleId: 1, roleName: 'ADMIN', description: 'Super Administrator' },
        { roleId: 2, roleName: 'ORG', description: 'Organizacija / Admin' },
        { roleId: 3, roleName: 'TOURIST', description: 'Turist' },
      ], success: true
    });
  }

  if (url.includes('/organizations') && req.method === 'GET') {
    return ok({
      data: [
        { organizationId: 1, name: 'Kopaonik Resort d.o.o.', description: '', contactEmail: '', phone: '', website: '' },
        { organizationId: 2, name: 'Exit Festival d.o.o.', description: '', contactEmail: '', phone: '', website: '' },
        { organizationId: 3, name: 'Privatni apartman', description: '', contactEmail: '', phone: '', website: '' },
      ], success: true
    });
  }

  // ── Destinations ──────────────────────────────────────────────────────
  if (url.includes('/destinations') && req.method === 'GET' && !url.match(/\/destinations\/\d+/)) {
    return ok(paginate(DESTINATIONS, page, pageSize));
  }

  if (url.match(/\/destinations\/(\d+)$/) && req.method === 'GET') {
    const id = +url.split('/').pop()!;
    return ok({ data: DESTINATIONS.find(d => d.destinationId === id) ?? null, success: true });
  }

  // ── Write operations (POST/PUT/DELETE) — just echo success ───────────
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return ok({ data: null, success: true, message: 'Mock: operacija uspešna.' });
  }

  // ── Pass everything else through (e.g. tile server for maps) ─────────
  return next(req);
};
