import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

// ── Mock credentials ───────────────────────────────────────────────────────
//
//  Super Admin: superadmin@touristhub.me        / SuperAdmin123!
//  Admin:       ana.kovacevic@zabljak.travel    / Admin123!
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
  'superadmin@touristhub.me': {
    accessToken: 'mock-token-superadmin',
    user: {
      userId: 1,
      fullName: 'Marko Petrović',
      email: 'superadmin@touristhub.me',
      role: 'superadmin',
      organizationId: null,
      isIndividual: true,
      accountStatus: 'active',
    },
  },
  'ana.kovacevic@zabljak.travel': {
    accessToken: 'mock-token-admin',
    user: {
      userId: 2,
      fullName: 'Ana Kovačević',
      email: 'ana.kovacevic@zabljak.travel',
      role: 'admin',
      organizationId: 1,
      isIndividual: false,
      accountStatus: 'active',
    },
  },
};

const PASSWORDS: Record<string, string> = {
  'superadmin@touristhub.me': 'SuperAdmin123!',
  'ana.kovacevic@zabljak.travel': 'Admin123!',
};

export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.endsWith('/auth/register') && req.method === 'POST') {
    return of(new HttpResponse({
      status: 201,
      body: { success: true, message: 'Verifikacioni email je poslat.' },
    }));
  }

  if (req.url.endsWith('/auth/login') && req.method === 'POST') {
    const body = req.body as { email: string; password: string };
    const match = MOCK_USERS[body?.email ?? ''];

    if (match && body?.password === PASSWORDS[body.email]) {
      return of(new HttpResponse({ status: 200, body: match }));
    }
    return of(new HttpResponse({
      status: 401,
      body: { message: 'Pogrešan email ili lozinka.' },
    }));
  }

  return next(req);
};
