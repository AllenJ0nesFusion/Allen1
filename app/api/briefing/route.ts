import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST() {
  const sql = getDb();
  const tasks = await sql`
    SELECT DISTINCT
      t.wbs_id, t.task_name, t.status, t.finish_date, t.owner, t.notes,
      array_agg(tg.goal ORDER BY tg.goal) AS goals
    FROM tasks t
    JOIN task_goals tg ON t.wbs_id = tg.wbs_id
    WHERE t.outline_level = 3
    GROUP BY t.wbs_id
    ORDER BY t.wbs_id
  `;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';

  const taskLines = tasks.map((t) =>
    `- [${t.wbs_id}] ${t.task_name} | Goals: ${(t.goals as string[]).join(', ')} | Status: ${t.status} | Due: ${formatDate(t.finish_date as string | null)} | Owner: ${t.owner || 'TBD'} | Notes: ${t.notes || 'none'}`
  ).join('\n');

  const prompt = `You are helping Allen Jones at Fusion Health write a paste-ready L&D Goals Tracker status update.

Here are the current WBS tasks for L&D goals:

${taskLines}

Write a concise professional status update suitable for an L&D Goals Tracker. Organize by objective (Obj 1, Obj 2, Obj 3). For each objective, summarize progress, flag any blockers or decisions required, and note upcoming milestones. Use bullet points. Keep the tone executive-appropriate — clear and direct.`;

  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ content });
}
