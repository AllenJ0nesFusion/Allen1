import { getDb } from '@/lib/db';
import { hashPassword, type Role } from '@/lib/auth';
import { requireRole } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

const ROLES: Role[] = ['Admin', 'Owner', 'Contributor', 'Viewer'];

// Update a user's role/active state, or reset their password to a new temp one.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('Admin');
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const body = await request.json() as { role?: Role; active?: boolean; tempPassword?: string };
  const sql = getDb();

  if (body.role && ROLES.includes(body.role)) {
    await sql`UPDATE users SET role = ${body.role} WHERE id = ${id}`;
  }
  if (typeof body.active === 'boolean') {
    await sql`UPDATE users SET active = ${body.active} WHERE id = ${id}`;
  }
  if (body.tempPassword) {
    if (body.tempPassword.length < 8) {
      return NextResponse.json({ error: 'Temporary password must be at least 8 characters.' }, { status: 400 });
    }
    await sql`UPDATE users SET password_hash = ${hashPassword(body.tempPassword)}, must_reset = true WHERE id = ${id}`;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('Admin');
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  // Don't allow deleting yourself (avoids locking out the last admin by accident)
  if (Number(id) === guard.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }
  const sql = getDb();
  await sql`DELETE FROM users WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
