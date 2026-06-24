import { getDb } from '@/lib/db';
import { ensureGoalsSchema, ensureCheckinsTable } from '@/lib/goals';
import { getSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

async function setup() {
  const sql = getDb();
  await ensureGoalsSchema(sql);
  await ensureCheckinsTable(sql);
  return sql;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = await setup();
  const rows = await sql`
    SELECT id, goal_id, week_of, author_user_id, author_name, health_snapshot, notes, created_at
    FROM goal_checkins
    WHERE goal_id = ${Number(id)}
    ORDER BY week_of DESC, created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    week_of?: string;
    health_snapshot?: string;
    notes?: string;
  };

  if (!body.week_of) return NextResponse.json({ error: 'week_of is required' }, { status: 400 });
  if (!body.notes?.trim()) return NextResponse.json({ error: 'notes are required' }, { status: 400 });

  const sql = await setup();

  // Verify goal exists
  const goal = await sql`SELECT id FROM goals WHERE id = ${Number(id)}`;
  if (goal.length === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

  const health = body.health_snapshot ?? 'On Track';
  const notes = body.notes.trim();

  const inserted = await sql`
    INSERT INTO goal_checkins (goal_id, week_of, author_user_id, author_name, health_snapshot, notes)
    VALUES (
      ${Number(id)},
      ${body.week_of}::date,
      ${session.userId},
      ${session.name || session.email},
      ${health},
      ${notes}
    )
    RETURNING *
  `;
  return NextResponse.json(inserted[0], { status: 201 });
}
