import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ week: string }> }
) {
  const sql = getDb();
  const { week } = await params;

  const capRows = await sql`
    SELECT week_start, week_end FROM capacity_weeks WHERE week_start = ${week}
  `;
  if (capRows.length === 0) {
    return NextResponse.json({ tasks: [] });
  }
  const { week_end } = capRows[0];

  const tasks = await sql`
    SELECT wbs_id, task_name, owner, status, start_date, finish_date, effort_hrs
    FROM tasks
    WHERE outline_level = 3
      AND start_date <= ${String(week_end)}::date
      AND finish_date >= ${week}::date
    ORDER BY wbs_id
  `;
  return NextResponse.json({ tasks });
}
