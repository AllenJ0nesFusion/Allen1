import { getDb } from '@/lib/db';
import { ensureUsersTable } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';

// Minimal user list (id, name, email) for owner/assignee dropdowns — any signed-in user.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const sql = getDb();
  await ensureUsersTable(sql);
  const rows = await sql`SELECT id, name, email FROM users WHERE active = true ORDER BY name, email`;
  return NextResponse.json(rows);
}
