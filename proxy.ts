import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifyToken } from '@/lib/auth';

// Paths that don't require a session
const PUBLIC_PATHS = ['/login'];
const PUBLIC_API_PREFIXES = ['/api/auth/'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublicPage || isPublicApi) return NextResponse.next();

  const user = verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (user) return NextResponse.next();

  // Unauthenticated: APIs get 401, pages redirect to /login
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp)$).*)'],
};
