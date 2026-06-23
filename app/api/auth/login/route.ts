import { getDb } from '@/lib/db';
import { ensureUsersTable, verifyPassword, type SessionUser } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const sql = getDb();
  await ensureUsersTable(sql);

  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()} AND active = true`;
  const u = rows[0];
  if (!u || !verifyPassword(password, u.password_hash as string)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const user: SessionUser = {
    userId: Number(u.id),
    email: u.email as string,
    name: (u.name as string) || (u.email as string),
    role: u.role as SessionUser['role'],
  };
  const res = NextResponse.json({ user, mustReset: u.must_reset === true });
  setSessionCookie(res, user);
  return res;
}
