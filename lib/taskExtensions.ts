import { type NeonQueryFunction } from '@neondatabase/serverless';

type Sql = NeonQueryFunction<false, false>;

export async function ensureTaskCommentsTable(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS task_comments (
    id BIGSERIAL PRIMARY KEY,
    wbs_id TEXT NOT NULL REFERENCES tasks(wbs_id) ON DELETE CASCADE,
    author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_task_comments_wbs_id ON task_comments(wbs_id)`;
}

export async function ensureTaskStatusHistoryTable(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS task_status_history (
    id BIGSERIAL PRIMARY KEY,
    wbs_id TEXT NOT NULL REFERENCES tasks(wbs_id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_task_status_history_wbs_id ON task_status_history(wbs_id)`;
}
