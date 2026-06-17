import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getDb();
  const { id } = await params;
  const body = await request.json() as { status?: string; notes?: string; finish_date?: string };
  const { status, notes, finish_date } = body;

  await sql`
    UPDATE tasks SET
      status = COALESCE(${status ?? null}, status),
      notes = COALESCE(${notes ?? null}, notes),
      finish_date = COALESCE(${finish_date ?? null}::date, finish_date),
      updated_at = NOW()
    WHERE wbs_id = ${id}
  `;

  const rows = await sql`SELECT * FROM tasks WHERE wbs_id = ${id}`;
  return NextResponse.json(rows[0]);
}
