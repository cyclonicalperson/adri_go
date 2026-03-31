import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

// ── Mock users ────────────────────────────────────────────────────────────
//
//  SUPERADMIN:  superadmin@touristhub.rs  /  admin123
//  ADMIN (ORG): admin@kopaonik.rs         /  admin123
//
const MOCK_USERS: Record<string, {
  accessToken: string;
  user: { userId: number; fullName: string; email: string; role: 'ADMIN' | 'ORG'; organizationId: number | null };
}> = {
  'superadmin@touristhub.rs': {
    accessToken: 'mock-token-superadmin',
    user: {
      userId: 1,
      fullName: 'Marko Super',
      email: 'superadmin@touristhub.rs',
      role: 'ADMIN',
      organizationId: null,
    },
  },
  'admin@kopaonik.rs': {
    accessToken: 'mock-token-org-admin',
    user: {
      userId: 2,
      fullName: 'Ana Petrović',
      email: 'admin@kopaonik.rs',
      role: 'ORG',
      organizationId: 1,
    },
  },
};

export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.endsWith('/auth/login') && req.method === 'POST') {
    const body = req.body as { email: string; password: string };
    const match = MOCK_USERS[body?.email ?? ''];

    if (match && body?.password === 'admin123') {
      return of(new HttpResponse({ status: 200, body: match }));
    }
    return of(new HttpResponse({
      status: 401,
      body: { message: 'Pogrešan email ili lozinka.' },
    }));
  }

  return next(req);
};
