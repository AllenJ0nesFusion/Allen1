import { getDb } from '@/lib/db';
import { ensureUsersTable, hashPassword, type Role } from '@/lib/auth';
import { requireRole } from '@/lib/session';
import { sendInviteEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

const ROLES: Role[] = ['Admin', 'Owner', 'Contributor', 'Viewer'];

export async function GET() {
  const guard = await requireRole('Admin');
  if (guard instanceof NextResponse) return guard;
  const sql = getDb();
  await ensureUsersTable(sql);
  const rows = await sql`
    SELECT id, email, name, role, must_reset, active, created_at
    FROM users ORDER BY role, email
  `;
  return NextResponse.json(rows);
}

// Invite a user: create an account with a temporary password they must reset.
export async function POST(request: NextRequest) {
  const guard = await requireRole('Admin');
  if (guard instanceof NextResponse) return guard;

  const sql = getDb();
  await ensureUsersTable(sql);
  const body = await request.json() as { email?: string; name?: string; role?: Role; tempPassword?: string };
  const email = body.email?.trim().toLowerCase();
  const role = body.role && ROLES.includes(body.role) ? body.role : 'Contributor';
  const tempPassword = body.tempPassword?.trim();

  if (!email || !tempPassword) {
    return NextResponse.json({ error: 'Email and a temporary password are required.' }, { status: 400 });
  }
  if (tempPassword.length < 8) {
    return NextResponse.json({ error: 'Temporary password must be at least 8 characters.' }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'A user with that email already exists.' }, { status: 409 });
  }

  await sql`
    INSERT INTO users (email, name, password_hash, role, must_reset)
    VALUES (${email}, ${body.name?.trim() ?? ''}, ${hashPassword(tempPassword)}, ${role}, ${true})
  `;
  return NextResponse.json({ ok: true }, { status: 201 });
}
