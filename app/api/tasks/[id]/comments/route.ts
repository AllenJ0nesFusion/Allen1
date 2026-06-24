import { getDb } from '@/lib/db';
import { ensureTaskCommentsTable } from '@/lib/taskExtensions';
import { getSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  await ensureTaskCommentsTable(sql);
  const rows = await sql`
    SELECT id, author_name, body, created_at
    FROM task_comments
    WHERE wbs_id = ${id}
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as { body?: string };
  if (!body.body?.trim()) return NextResponse.json({ error: 'Comment body is required.' }, { status: 400 });

  const sql = getDb();
  await ensureTaskCommentsTable(sql);

  const inserted = await sql`
    INSERT INTO task_comments (wbs_id, author_user_id, author_name, body)
    VALUES (${id}, ${session.userId}, ${session.name || session.email}, ${body.body.trim()})
    RETURNING id, author_name, body, created_at
  `;
  return NextResponse.json(inserted[0], { status: 201 });
}
