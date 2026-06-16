import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const result = await sql`SELECT * FROM tasks WHERE wbs_id = ${id}`;
  return NextResponse.json(result.rows[0]);
}
