import { type NeonQueryFunction } from '@neondatabase/serverless';

type Sql = NeonQueryFunction<false, false>;

export const HEALTH_OPTIONS = ['On Track', 'At Risk', 'Off Track', 'Not Started'] as const;
export type Health = (typeof HEALTH_OPTIONS)[number];

/**
 * Create the goals table and tasks.goal_id column if missing. On first creation,
 * seed one goal per existing task "lane" and link those tasks to it, so the current
 * WBS carries over as departmental goals rather than being thrown away.
 */
export async function ensureGoalsSchema(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS goals (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_user_id BIGINT,
    target_date DATE,
    health VARCHAR(20) NOT NULL DEFAULT 'On Track',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    sort_order INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  const hasGoalId = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'goal_id'
  `;
  if (hasGoalId.length === 0) {
    await sql`ALTER TABLE tasks ADD COLUMN goal_id BIGINT`;
  }

  // Seed goals from lanes only when there are none yet.
  const count = await sql`SELECT COUNT(*)::int AS n FROM goals`;
  if ((count[0]?.n ?? 0) === 0) {
    const lanes = await sql`SELECT DISTINCT lane FROM tasks WHERE lane IS NOT NULL ORDER BY lane`;
    let order = 0;
    for (const row of lanes) {
      const lane = row.lane as string;
      const inserted = await sql`
        INSERT INTO goals (name, description, health, sort_order)
        VALUES (${lane}, ${'Carried over from your 2026 WBS lane.'}, ${'On Track'}, ${order})
        RETURNING id
      `;
      const goalId = inserted[0].id;
      await sql`UPDATE tasks SET goal_id = ${goalId} WHERE lane = ${lane} AND goal_id IS NULL`;
      order += 1;
    }
  }
}

/** Create the goal_checkins table if missing. */
export async function ensureCheckinsTable(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS goal_checkins (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    week_of DATE NOT NULL,
    author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT,
    health_snapshot VARCHAR(20) NOT NULL DEFAULT 'On Track',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

/** Look up the goal a new task should belong to, based on its lane. */
export async function goalIdForLane(sql: Sql, lane: string): Promise<number | null> {
  const rows = await sql`SELECT id FROM goals WHERE name = ${lane} ORDER BY id LIMIT 1`;
  return rows[0]?.id != null ? Number(rows[0].id) : null;
}
