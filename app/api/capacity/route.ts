import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT
      week_start, week_end, available_hrs, lane1_planned, lane2_planned,
      lane1_planned + lane2_planned AS total_planned,
      available_hrs - lane1_planned - lane2_planned AS variance,
      notes
    FROM capacity_weeks
    ORDER BY week_start
  `;
  return NextResponse.json(rows);
}
