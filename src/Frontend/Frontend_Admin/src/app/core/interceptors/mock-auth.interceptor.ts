import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

// ── Mock credentials — EXACTLY as in README.md ───────────────────────────
//
//  Super Admin: superadmin@adrigo.rs   / admin123
//  Admin:       admin@kopaonik.rs          / admin123
//
//  Roles match DB ENUM exactly: admin_user.role = ENUM('superadmin','admin')
// ──────────────────────────────────────────────────────────────────────────

const MOCK_USERS: Record<string, {
  accessToken: string;
  user: {
    userId: number;
    fullName: string;
    email: string;
    role: 'superadmin' | 'admin';
    organizationId: number | null;
    isIndividual: boolean;
    accountStatus: 'active';
    permissions?: string[];
    permissionGrants?: { code: string; regionId: number | null }[];
  };
}> = {
  'superadmin@adrigo.rs': {
    accessToken: 'mock-token-superadmin',
    user: {
      userId: 1,
      fullName: 'Marko Petrović',
      email: 'superadmin@adrigo.rs',  // ← mora da se poklapa sa ključem
      role: 'superadmin',
      organizationId: null,
      isIndividual: true,
      accountStatus: 'active',
      permissions: [],
      permissionGrants: [],
    },
  },
  'admin@kopaonik.rs': {
    accessToken: 'mock-token-admin',
    user: {
      userId: 2,
      fullName: 'Ana Kovačević',
      email: 'admin@kopaonik.rs',  // ← mora da se poklapa sa ključem
      role: 'admin',
      organizationId: 1,
      isIndividual: false,
      accountStatus: 'active',
      permissions: [
        'create_event',
        'create_route',
        'create_cultural_site',
        'create_monument',
        'view_analytics',
        'manage_reviews',
        'manage_own_posts',
      ],
      permissionGrants: [
        { code: 'create_event', regionId: null },
        { code: 'create_route', regionId: null },
        { code: 'create_cultural_site', regionId: null },
        { code: 'create_monument', regionId: null },
        { code: 'view_analytics', regionId: null },
        { code: 'manage_reviews', regionId: null },
        { code: 'manage_own_posts', regionId: null },
      ],
    },
  },
};

const PASSWORDS: Record<string, string> = {
  'superadmin@adrigo.rs': 'admin123',
  'admin@kopaonik.rs': 'admin123',
};

export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  // ── Registration (mock success) ────────────────────────────────────────
  if (req.url.endsWith('/auth/register') && req.method === 'POST') {
    return of(new HttpResponse({
      status: 201,
      body: { success: true, message: 'Verifikacioni email je poslat.' },
    }));
  }

  // ── Login ─────────────────────────────────────────────────────────────
  if (req.url.endsWith('/auth/login') && req.method === 'POST') {
    const body = req.body as { email: string; password: string };
    const email = body?.email?.toLowerCase().trim();
    const match = MOCK_USERS[email];

    if (match && body?.password === PASSWORDS[email]) {
      return of(new HttpResponse({ status: 200, body: match }));
    }

    return of(new HttpResponse({
      status: 401,
      body: { message: 'Pogrešan email ili lozinka.' },
    }));
  }

  // ── Logout ────────────────────────────────────────────────────────────
  if (req.url.endsWith('/auth/logout') && req.method === 'POST') {
    return of(new HttpResponse({ status: 200, body: { success: true } }));
  }

  return next(req);
};
