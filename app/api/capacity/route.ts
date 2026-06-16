import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await sql`
    SELECT
      week_start, week_end, available_hrs, lane1_planned, lane2_planned,
      lane1_planned + lane2_planned AS total_planned,
      available_hrs - lane1_planned - lane2_planned AS variance,
      notes
    FROM capacity_weeks
    ORDER BY week_start
  `;
  return NextResponse.json(result.rows);
}
