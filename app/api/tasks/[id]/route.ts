import { getDb } from '@/lib/db';
import { ensureDependenciesTable, ensurePercentColumn, ensureAssignedUserColumn, reschedule } from '@/lib/schedule';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  await ensurePercentColumn(sql);
  await ensureAssignedUserColumn(sql);
  const { id } = await params;
  const body = await request.json() as {
    status?: string;
    notes?: string;
    finish_date?: string;
    effort_hrs?: number | null;
    duration_days?: number | null;
    percent_complete?: number | null;
    assigned_user_id?: number | null;
  };
  const { status, notes, finish_date, effort_hrs, duration_days, percent_complete, assigned_user_id } = body;
  const pct = percent_complete == null ? null : Math.max(0, Math.min(100, Math.round(percent_complete)));

  // Read current row, merge, write back (neon driver can't compose sql fragments)
  const cur = await sql`SELECT * FROM tasks WHERE wbs_id = ${id}`;
  if (cur.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const c = cur[0];

  const newAssignee = assigned_user_id !== undefined ? assigned_user_id : (c.assigned_user_id ?? null);

  await sql`
    UPDATE tasks SET
      status = COALESCE(${status ?? null}, status),
      notes = COALESCE(${notes ?? null}, notes),
      finish_date = COALESCE(${finish_date ?? null}::date, finish_date),
      effort_hrs = COALESCE(${effort_hrs ?? null}, effort_hrs),
      duration_days = COALESCE(${duration_days ?? null}, duration_days),
      percent_complete = COALESCE(${pct}, percent_complete),
      assigned_user_id = ${newAssignee},
      updated_at = NOW()
    WHERE wbs_id = ${id}
  `;

  // A date change may push dependent tasks forward
  if (finish_date !== undefined) {
    await reschedule(sql);
  }

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

  await ensureDependenciesTable(sql);
  await sql`DELETE FROM task_dependencies WHERE wbs_id = ${id} OR predecessor_wbs_id = ${id}`;
  await sql`DELETE FROM task_goals WHERE wbs_id = ${id}`;
  await sql`DELETE FROM tasks WHERE wbs_id = ${id}`;
  return NextResponse.json({ ok: true });
}
