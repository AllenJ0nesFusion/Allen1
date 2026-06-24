import { getDb } from '@/lib/db';
import { ensureGoalsSchema, HEALTH_OPTIONS, type Health } from '@/lib/goals';
import { ensurePercentColumn } from '@/lib/schedule';
import { requireRole } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const sql = getDb();
  await ensurePercentColumn(sql);
  await ensureGoalsSchema(sql);

  // Rollup: each goal's % is the mean % complete of its leaf tasks
  const rows = await sql`
    SELECT
      g.id, g.name, g.description, g.owner_user_id, g.target_date, g.health, g.status, g.sort_order,
      u.name AS owner_name, u.email AS owner_email,
      COUNT(t.wbs_id) FILTER (WHERE t.outline_level = 3) AS task_count,
      COUNT(t.wbs_id) FILTER (WHERE t.outline_level = 3 AND t.status = 'Complete') AS done_count,
      COALESCE(ROUND(AVG(t.percent_complete) FILTER (WHERE t.outline_level = 3)), 0) AS pct
    FROM goals g
    LEFT JOIN tasks t ON t.goal_id = g.id
    LEFT JOIN users u ON u.id = g.owner_user_id
    GROUP BY g.id, u.name, u.email
    ORDER BY g.sort_order NULLS LAST, g.id
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const guard = await requireRole('Admin', 'Owner');
  if (guard instanceof NextResponse) return guard;

  const sql = getDb();
  await ensureGoalsSchema(sql);
  const body = await request.json() as {
    name?: string; description?: string; owner_user_id?: number | null;
    target_date?: string | null; health?: Health;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'A goal name is required.' }, { status: 400 });
  }
  const health = body.health && HEALTH_OPTIONS.includes(body.health) ? body.health : 'On Track';

  const inserted = await sql`
    INSERT INTO goals (name, description, owner_user_id, target_date, health)
    VALUES (
      ${body.name.trim()}, ${body.description?.trim() || null},
      ${body.owner_user_id ?? null}, ${body.target_date || null}::date, ${health}
    )
    RETURNING id
  `;
  return NextResponse.json({ id: inserted[0].id }, { status: 201 });
}
