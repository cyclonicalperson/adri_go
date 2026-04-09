import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

// ── Mock credentials — EXACTLY as in README.md ───────────────────────────
//
//  Super Admin: superadmin@touristhub.rs   / admin123
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
  };
}> = {
  'superadmin@touristhub.rs': {
    accessToken: 'mock-token-superadmin',
    user: {
      userId: 1,
      fullName: 'Marko Petrović',
      email: 'superadmin@touristhub.rs',
      role: 'superadmin',
      organizationId: null,
      isIndividual: true,
      accountStatus: 'active',
    },
  },
  'admin@kopaonik.rs': {
    accessToken: 'mock-token-admin',
    user: {
      userId: 2,
      fullName: 'Ana Kovačević',
      email: 'admin@kopaonik.rs',
      role: 'admin',
      organizationId: 1,
      isIndividual: false,
      accountStatus: 'active',
    },
  },
};

const PASSWORDS: Record<string, string> = {
  'superadmin@touristhub.rs': 'admin123',
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
    const email = body?.email?.toLowerCase();
    const match = MOCK_USERS[email];

    if (match && body?.password === PASSWORDS[email]) {
      // Simulate small network delay for realistic UX
      return of(new HttpResponse({ status: 200, body: match })).pipe(
        // If you want delay: import { delay } from 'rxjs'; then use .pipe(delay(300))
      );
    }

    return of(new HttpResponse({
      status: 401,
      body: { message: 'Pogrešan email ili lozinka.' },
    }));
  }

  // ── Logout (clear mock session) ────────────────────────────────────────
  if (req.url.endsWith('/auth/logout') && req.method === 'POST') {
    return of(new HttpResponse({ status: 200, body: { success: true } }));
  }

  return next(req);
};
