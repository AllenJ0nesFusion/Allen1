import { getDb } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

// Change your own password (also used to clear the must_reset flag).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { currentPassword, newPassword } = await request.json() as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.userId}`;
  const u = rows[0];
  if (!u || !verifyPassword(currentPassword, u.password_hash as string)) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  await sql`UPDATE users SET password_hash = ${hashPassword(newPassword)}, must_reset = false WHERE id = ${session.userId}`;
  return NextResponse.json({ ok: true });
}
