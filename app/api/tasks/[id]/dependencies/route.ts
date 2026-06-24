import { getDb } from '@/lib/db';
import { ensureDependenciesTable, wouldCreateCycle, reschedule, type DepRow } from '@/lib/schedule';
import { NextRequest, NextResponse } from 'next/server';

// Add a predecessor to a task: { predecessor_wbs_id, dep_type?, lag_days? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  await ensureDependenciesTable(sql);
  const { id } = await params;
  const body = await request.json() as { predecessor_wbs_id?: string; dep_type?: string; lag_days?: number };
  const predecessor_wbs_id = body.predecessor_wbs_id;
  const dep_type = body.dep_type ?? 'FS';
  const lag_days = body.lag_days ?? 0;

  if (!predecessor_wbs_id) {
    return NextResponse.json({ error: 'predecessor_wbs_id is required' }, { status: 400 });
  }
  if (predecessor_wbs_id === id) {
    return NextResponse.json({ error: 'A task cannot depend on itself.' }, { status: 400 });
  }

  const exists = await sql`SELECT wbs_id FROM tasks WHERE wbs_id = ${predecessor_wbs_id}`;
  if (exists.length === 0) {
    return NextResponse.json({ error: 'Predecessor task not found.' }, { status: 400 });
  }

  const deps = await sql`SELECT wbs_id, predecessor_wbs_id, dep_type, lag_days FROM task_dependencies` as DepRow[];
  if (wouldCreateCycle(deps, id, predecessor_wbs_id)) {
    return NextResponse.json({ error: 'That link would create a circular dependency.' }, { status: 409 });
  }

  await sql`
    INSERT INTO task_dependencies (wbs_id, predecessor_wbs_id, dep_type, lag_days)
    VALUES (${id}, ${predecessor_wbs_id}, ${dep_type}, ${lag_days})
    ON CONFLICT (wbs_id, predecessor_wbs_id) DO UPDATE SET dep_type = EXCLUDED.dep_type, lag_days = EXCLUDED.lag_days
  `;

  await reschedule(sql);
  return NextResponse.json({ ok: true });
}

// Remove a predecessor: ?predecessor=<wbs_id>
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  await ensureDependenciesTable(sql);
  const { id } = await params;
  const predecessor = request.nextUrl.searchParams.get('predecessor');
  if (!predecessor) {
    return NextResponse.json({ error: 'predecessor query param is required' }, { status: 400 });
  }
  await sql`DELETE FROM task_dependencies WHERE wbs_id = ${id} AND predecessor_wbs_id = ${predecessor}`;
  return NextResponse.json({ ok: true });
}
