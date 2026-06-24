import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signToken,
  verifyToken,
  type Role,
  type SessionUser,
} from './auth';

/** Read & verify the current session from the request cookie (Server Components / Route Handlers). */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyToken(token);
}

/** Attach a fresh session cookie to a NextResponse (used by login route). */
export function setSessionCookie(res: NextResponse, user: SessionUser): void {
  res.cookies.set(SESSION_COOKIE, signToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Guard for route handlers: returns the user or a 401/403 response. */
export async function requireRole(...allowed: Role[]): Promise<SessionUser | NextResponse> {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (allowed.length && !allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  return user;
}
