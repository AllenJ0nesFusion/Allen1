import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  const { id } = await params;
  const body = await request.json() as { status?: string; notes?: string; finish_date?: string };
  const { status, notes, finish_date } = body;

  await sql`
    UPDATE tasks SET
      status = COALESCE(${status ?? null}, status),
      notes = COALESCE(${notes ?? null}, notes),
      finish_date = COALESCE(${finish_date ?? null}::date, finish_date),
      updated_at = NOW()
    WHERE wbs_id = ${id}
  `;

  const rows = await sql`SELECT * FROM tasks WHERE wbs_id = ${id}`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  const { id } = await params;

  // Block deleting a workstream/lane that still has child tasks
  const children = await sql`SELECT wbs_id FROM tasks WHERE parent_wbs_id = ${id} LIMIT 1`;
  if (children.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete: this item still has child tasks. Delete those first.' },
      { status: 409 }
    );
  }

  await sql`DELETE FROM task_goals WHERE wbs_id = ${id}`;
  await sql`DELETE FROM tasks WHERE wbs_id = ${id}`;
  return NextResponse.json({ ok: true });
}
