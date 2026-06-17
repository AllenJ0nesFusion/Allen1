import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT
      t.wbs_id, t.parent_wbs_id, t.outline_level, t.lane, t.task_name,
      t.start_date, t.finish_date, t.duration_days, t.effort_hrs,
      t.owner, t.status, t.notes, t.updated_at,
      COALESCE(array_agg(tg.goal) FILTER (WHERE tg.goal IS NOT NULL), '{}') AS goals
    FROM tasks t
    LEFT JOIN task_goals tg ON t.wbs_id = tg.wbs_id
    GROUP BY t.wbs_id
    ORDER BY t.wbs_id
  `;
  return NextResponse.json(rows);
}
