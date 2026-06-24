import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT id, type, name, date, lane_goal, allen_role, notes
    FROM milestones
    ORDER BY date, id
  `;
  return NextResponse.json(rows);
}
