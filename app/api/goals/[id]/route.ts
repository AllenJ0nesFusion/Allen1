import { getDb } from '@/lib/db';
import { HEALTH_OPTIONS, type Health } from '@/lib/goals';
import { requireRole } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('Admin', 'Owner');
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const sql = getDb();

  const current = await sql`SELECT * FROM goals WHERE id = ${id}`;
  if (current.length === 0) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });
  const g = current[0];

  // Merge only the keys the client actually sent (present in the body)
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const name = has('name') && String(body.name).trim() ? String(body.name).trim() : (g.name as string);
  const description = has('description') ? (body.description as string | null) : (g.description as string | null);
  const owner_user_id = has('owner_user_id') ? (body.owner_user_id as number | null) : (g.owner_user_id as number | null);
  const target_date = has('target_date') ? ((body.target_date as string) || null) : (g.target_date as string | null);
  const status = has('status') ? (body.status as string) : (g.status as string);
  let health = g.health as Health;
  if (has('health') && HEALTH_OPTIONS.includes(body.health as Health)) health = body.health as Health;

  await sql`
    UPDATE goals SET
      name = ${name}, description = ${description}, owner_user_id = ${owner_user_id},
      target_date = ${target_date}::date, health = ${health}, status = ${status}
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('Admin', 'Owner');
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const sql = getDb();
  // Unlink tasks first so they aren't orphaned to a missing goal
  await sql`UPDATE tasks SET goal_id = NULL WHERE goal_id = ${id}`;
  await sql`DELETE FROM goals WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
