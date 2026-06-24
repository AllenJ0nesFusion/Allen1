import { getDb } from '@/lib/db';
import { ensureTaskStatusHistoryTable } from '@/lib/taskExtensions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  await ensureTaskStatusHistoryTable(sql);
  const rows = await sql`
    SELECT id, from_status, to_status, changed_by_name, changed_at
    FROM task_status_history
    WHERE wbs_id = ${id}
    ORDER BY changed_at DESC
  `;
  return NextResponse.json(rows);
}
