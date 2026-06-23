import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const sql = getDb();

  // Progress by lane (leaf tasks only)
  const laneProgress = await sql`
    SELECT
      lane,
      COUNT(*) FILTER (WHERE outline_level = 3) AS total,
      COUNT(*) FILTER (WHERE outline_level = 3 AND status = 'Complete') AS complete,
      COUNT(*) FILTER (WHERE outline_level = 3 AND status = 'In Progress') AS in_progress
    FROM tasks
    GROUP BY lane
    ORDER BY lane
  `;

  // Status breakdown (leaf tasks)
  const statusBreakdown = await sql`
    SELECT status, COUNT(*) AS count
    FROM tasks
    WHERE outline_level = 3
    GROUP BY status
    ORDER BY count DESC
  `;

  // Needs attention: Decision Required or Blocked
  const needsAttention = await sql`
    SELECT wbs_id, task_name, lane, status, owner, finish_date, notes
    FROM tasks
    WHERE status IN ('Decision Required', 'Blocked')
    ORDER BY
      CASE status WHEN 'Blocked' THEN 0 WHEN 'Decision Required' THEN 1 ELSE 2 END,
      finish_date NULLS LAST
  `;

  // Upcoming milestones (from today forward)
  const upcomingMilestones = await sql`
    SELECT id, type, name, date, lane_goal, allen_role
    FROM milestones
    WHERE date >= CURRENT_DATE
    ORDER BY date
    LIMIT 5
  `;

  // Fallback if none upcoming (clock outside project window): show earliest 5
  const milestones = upcomingMilestones.length > 0
    ? upcomingMilestones
    : await sql`SELECT id, type, name, date, lane_goal, allen_role FROM milestones ORDER BY date LIMIT 5`;

  // Current week capacity
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

  // Count of overloaded weeks
  const overloaded = await sql`
    SELECT COUNT(*) AS count FROM capacity_weeks
    WHERE available_hrs - lane1_planned - lane2_planned < 0
  `;

  return NextResponse.json({
    laneProgress,
    statusBreakdown,
    needsAttention,
    milestones,
    currentWeek: fallbackWeek[0] ?? null,
    overloadedWeeks: Number(overloaded[0]?.count ?? 0),
  });
}
