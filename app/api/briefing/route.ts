import { getDb } from '@/lib/db';
import { ensureGoalsSchema, ensureCheckinsTable } from '@/lib/goals';
import { ensurePercentColumn } from '@/lib/schedule';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST() {
  const sql = getDb();
  await ensureGoalsSchema(sql);
  await ensureCheckinsTable(sql);
  await ensurePercentColumn(sql);

  // Goals with rollup progress
  const goals = await sql`
    SELECT
      g.id, g.name, g.health, g.target_date,
      u.name AS owner_name, u.email AS owner_email,
      COUNT(t.wbs_id) FILTER (WHERE t.outline_level = 3) AS task_count,
      COUNT(t.wbs_id) FILTER (WHERE t.outline_level = 3 AND t.status = 'Complete') AS done_count,
      COALESCE(ROUND(AVG(t.percent_complete) FILTER (WHERE t.outline_level = 3)), 0) AS pct
    FROM goals g
    LEFT JOIN tasks t ON t.goal_id = g.id
    LEFT JOIN users u ON u.id = g.owner_user_id
    GROUP BY g.id, u.name, u.email
    ORDER BY g.sort_order NULLS LAST, g.id
  `;

  // Latest check-in per goal
  const checkins = await sql`
    SELECT DISTINCT ON (goal_id)
      goal_id, week_of, health_snapshot, notes, author_name
    FROM goal_checkins
    ORDER BY goal_id, week_of DESC, created_at DESC
  `;
  const checkinByGoal = new Map(checkins.map((c) => [Number(c.goal_id), c]));

  // Needs-attention tasks
  const blocked = await sql`
    SELECT wbs_id, task_name, lane, status, owner, finish_date, notes
    FROM tasks
    WHERE status IN ('Decision Required', 'Blocked')
    ORDER BY CASE status WHEN 'Blocked' THEN 0 ELSE 1 END, finish_date NULLS LAST
  `;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';

  const goalLines = goals.map((g) => {
    const owner = g.owner_name || g.owner_email || 'Unassigned';
    const c = checkinByGoal.get(Number(g.id));
    const checkinLine = c
      ? `\n  Latest check-in (${formatDate(c.week_of as string)}): [${c.health_snapshot}] ${c.notes}`
      : '\n  Latest check-in: none';
    return `Goal: ${g.name} | Owner: ${owner} | Health: ${g.health} | Progress: ${g.pct}% (${g.done_count}/${g.task_count} tasks) | Target: ${formatDate(g.target_date as string | null)}${checkinLine}`;
  }).join('\n\n');

  const blockedLines = blocked.length > 0
    ? blocked.map((t) =>
        `- [${t.wbs_id}] ${t.task_name} | ${t.status} | Owner: ${t.owner || 'TBD'} | Due: ${formatDate(t.finish_date as string | null)}${t.notes ? ` | Notes: ${t.notes}` : ''}`
      ).join('\n')
    : 'None.';

  const prompt = `You are helping write a paste-ready L&D departmental goals status update for Allen Jones at Fusion Health.

GOALS SUMMARY:
${goalLines}

BLOCKED / DECISION REQUIRED TASKS:
${blockedLines}

Write a concise professional status update suitable for a department head audience. Structure it as:
1. Opening sentence with overall programme health and progress.
2. One section per goal — name as heading, 2-4 bullet points covering: progress this week (draw from the latest check-in notes if present), any blockers or decisions needed, and what's coming next.
3. A brief "Needs Attention" section if there are blocked/decision-required tasks.

Tone: executive-appropriate — direct, specific, no filler. Use the check-in notes as the primary source for "what happened this week"; supplement with task data for numbers.`;

  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ content });
}
