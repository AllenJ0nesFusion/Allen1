import { getDb } from '@/lib/db';
import { ensureDependenciesTable, ensurePercentColumn, computeCriticalPath, type DepRow } from '@/lib/schedule';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const sql = getDb();
  await ensureDependenciesTable(sql);
  await ensurePercentColumn(sql);
  const rows = await sql`
    SELECT
      t.wbs_id, t.parent_wbs_id, t.outline_level, t.lane, t.task_name,
      t.start_date, t.finish_date, t.duration_days, t.effort_hrs,
      t.owner, t.status, t.percent_complete, t.notes, t.updated_at,
      COALESCE(array_agg(tg.goal) FILTER (WHERE tg.goal IS NOT NULL), '{}') AS goals
    FROM tasks t
    LEFT JOIN task_goals tg ON t.wbs_id = tg.wbs_id
    GROUP BY t.wbs_id
    ORDER BY t.wbs_id
  `;
  const deps = await sql`
    SELECT wbs_id, predecessor_wbs_id, dep_type, lag_days FROM task_dependencies
  `;
  const depsTyped = deps as DepRow[];
  const predByTask = new Map<string, unknown[]>();
  for (const d of depsTyped) {
    if (!predByTask.has(d.wbs_id)) predByTask.set(d.wbs_id, []);
    predByTask.get(d.wbs_id)!.push({ wbs_id: d.predecessor_wbs_id, dep_type: d.dep_type, lag_days: d.lag_days });
  }

  const taskDates = rows.map((r) => ({
    wbs_id: r.wbs_id as string,
    start_date: r.start_date as string | null,
    finish_date: r.finish_date as string | null,
  }));
  const { critical, projectEnd } = computeCriticalPath(taskDates, depsTyped);

  const withDeps = rows.map((r) => ({
    ...r,
    predecessors: predByTask.get(r.wbs_id as string) ?? [],
    is_critical: critical.has(r.wbs_id as string),
  }));
  return NextResponse.json({ tasks: withDeps, projectEnd });
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const body = await request.json() as {
    parent_wbs_id?: string;
    task_name?: string;
    status?: string;
    start_date?: string | null;
    finish_date?: string | null;
    effort_hrs?: number | null;
    owner?: string | null;
  };

  const { parent_wbs_id, task_name } = body;
  if (!parent_wbs_id || !task_name?.trim()) {
    return NextResponse.json({ error: 'parent_wbs_id and task_name are required' }, { status: 400 });
  }

  // The parent (workstream) determines the lane
  const parents = await sql`SELECT lane FROM tasks WHERE wbs_id = ${parent_wbs_id}`;
  if (parents.length === 0) {
    return NextResponse.json({ error: 'Parent workstream not found' }, { status: 400 });
  }
  const lane = parents[0].lane as string;

  // Generate the next child wbs_id under the parent (e.g. parent "1.2" -> "1.2.5")
  const children = await sql`
    SELECT wbs_id FROM tasks WHERE parent_wbs_id = ${parent_wbs_id}
  `;
  let maxChild = 0;
  for (const c of children) {
    const tail = String(c.wbs_id).split('.').pop();
    const n = parseInt(tail ?? '0', 10);
    if (!isNaN(n) && n > maxChild) maxChild = n;
  }
  const newWbsId = `${parent_wbs_id}.${maxChild + 1}`;

  const status = body.status ?? 'Not Started';
  const start_date = body.start_date || null;
  const finish_date = body.finish_date || null;
  const effort_hrs = body.effort_hrs ?? null;
  const owner = body.owner?.trim() || null;

  await sql`
    INSERT INTO tasks (wbs_id, parent_wbs_id, outline_level, lane, task_name, start_date, finish_date, effort_hrs, owner, status)
    VALUES (
      ${newWbsId}, ${parent_wbs_id}, 3, ${lane}, ${task_name.trim()},
      ${start_date}::date, ${finish_date}::date, ${effort_hrs}, ${owner}, ${status}
    )
  `;

  const rows = await sql`SELECT *, '{}'::text[] AS goals FROM tasks WHERE wbs_id = ${newWbsId}`;
  return NextResponse.json(rows[0], { status: 201 });
}
