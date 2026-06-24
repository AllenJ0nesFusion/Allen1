import { getDb } from '@/lib/db';
import { ensureAssignedUserColumn } from '@/lib/schedule';
import { sendWeeklyDigest } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

// Called by Vercel Cron every Monday at 08:00 UTC.
// Protected by Authorization: Bearer <CRON_SECRET>.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sql = getDb();
  await ensureAssignedUserColumn(sql);

  const appUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  // Tasks assigned to a user due in the next 7 days, not yet complete
  const rows = await sql`
    SELECT
      t.wbs_id, t.task_name, t.finish_date, t.status,
      u.id AS user_id, u.email AS user_email, u.name AS user_name, u.active,
      g.name AS goal_name
    FROM tasks t
    JOIN users u ON u.id = t.assigned_user_id
    LEFT JOIN goals g ON g.id = t.goal_id
    WHERE
      t.outline_level = 3
      AND u.active = true
      AND t.status NOT IN ('Complete')
      AND t.finish_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    ORDER BY u.id, t.finish_date
  `;

  // Group by user
  const byUser = new Map<number, { email: string; name: string; tasks: typeof rows }>();
  for (const row of rows) {
    const uid = Number(row.user_id);
    if (!byUser.has(uid)) byUser.set(uid, { email: row.user_email as string, name: row.user_name as string, tasks: [] });
    byUser.get(uid)!.tasks.push(row);
  }

  const today = new Date();
  const weekStart = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let sent = 0;
  for (const [, { email, name, tasks }] of byUser) {
    await sendWeeklyDigest({
      to: email,
      name,
      tasks: tasks.map((t) => ({
        wbs_id: t.wbs_id as string,
        task_name: t.task_name as string,
        finish_date: t.finish_date as string | null,
        status: t.status as string,
        goal_name: t.goal_name as string | null,
      })),
      weekStart,
      appUrl,
    });
    sent += 1;
  }

  return NextResponse.json({ sent });
}
