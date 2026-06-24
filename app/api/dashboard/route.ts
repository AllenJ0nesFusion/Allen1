import { getDb } from '@/lib/db';
import { ensurePercentColumn } from '@/lib/schedule';
import { ensureGoalsSchema } from '@/lib/goals';
import { NextResponse } from 'next/server';

export async function GET() {
  const sql = getDb();
  await ensurePercentColumn(sql);

  const laneProgress = await sql`
    SELECT
      lane,
      COUNT(*) FILTER (WHERE outline_level = 3) AS total,
      COUNT(*) FILTER (WHERE outline_level = 3 AND status = 'Complete') AS complete,
      COUNT(*) FILTER (WHERE outline_level = 3 AND status = 'In Progress') AS in_progress,
      COALESCE(ROUND(AVG(percent_complete) FILTER (WHERE outline_level = 3)), 0) AS avg_pct
    FROM tasks
    GROUP BY lane
    ORDER BY lane
  `;

  const statusBreakdown = await sql`
    SELECT status, COUNT(*) AS count
    FROM tasks
    WHERE outline_level = 3
    GROUP BY status
    ORDER BY count DESC
  `;

  const needsAttention = await sql`
    SELECT wbs_id, task_name, lane, status, owner, finish_date, notes
    FROM tasks
    WHERE status IN ('Decision Required', 'Blocked')
    ORDER BY
      CASE status WHEN 'Blocked' THEN 0 WHEN 'Decision Required' THEN 1 ELSE 2 END,
      finish_date NULLS LAST
  `;

  const upcomingMilestones = await sql`
    SELECT id, type, name, date, lane_goal, allen_role
    FROM milestones
    WHERE date >= CURRENT_DATE
    ORDER BY date
    LIMIT 5
  `;

  const milestones = upcomingMilestones.length > 0
    ? upcomingMilestones
    : await sql`SELECT id, type, name, date, lane_goal, allen_role FROM milestones ORDER BY date LIMIT 5`;

  const currentWeek = await sql`
    SELECT week_start, week_end, available_hrs, lane1_planned, lane2_planned,
           lane1_planned + lane2_planned AS total_planned,
           available_hrs - lane1_planned - lane2_planned AS variance, notes
    FROM capacity_weeks
    WHERE CURRENT_DATE BETWEEN week_start AND week_end
    LIMIT 1
  `;
  const fallbackWeek = currentWeek.length > 0
    ? currentWeek
    : await sql`
        SELECT week_start, week_end, available_hrs, lane1_planned, lane2_planned,
               lane1_planned + lane2_planned AS total_planned,
               available_hrs - lane1_planned - lane2_planned AS variance, notes
        FROM capacity_weeks WHERE week_start >= CURRENT_DATE ORDER BY week_start LIMIT 1
      `;

  const overloaded = await sql`
    SELECT COUNT(*) AS count FROM capacity_weeks
    WHERE available_hrs - lane1_planned - lane2_planned < 0
  `;

  await ensureGoalsSchema(sql);
  const goalHealth = await sql`
    SELECT
      g.id, g.name, g.health, g.target_date,
      u.name AS owner_name, u.email AS owner_email,
      COALESCE(ROUND(AVG(t.percent_complete) FILTER (WHERE t.outline_level = 3)), 0) AS pct
    FROM goals g
    LEFT JOIN tasks t ON t.goal_id = g.id
    LEFT JOIN users u ON u.id = g.owner_user_id
    GROUP BY g.id, u.name, u.email
    ORDER BY g.sort_order NULLS LAST, g.id
  `;

  return NextResponse.json({
    laneProgress,
    statusBreakdown,
    needsAttention,
    milestones,
    currentWeek: fallbackWeek[0] ?? null,
    overloadedWeeks: Number(overloaded[0]?.count ?? 0),
    goalHealth,
  });
}
