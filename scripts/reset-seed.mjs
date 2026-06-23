// Run with: node scripts/reset-seed.mjs
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env.local manually
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/POSTGRES_URL=(.+)/);
if (!match) {
  console.error('POSTGRES_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(match[1].trim());

async function drop(label, fn) {
  try {
    await fn();
    console.log(`  cleared ${label}`);
  } catch {
    console.log(`  ${label} not present (ok)`);
  }
}

// Order matters: task_goals references tasks
await drop('task_goals', () => sql`DELETE FROM task_goals`);
await drop('tasks', () => sql`DELETE FROM tasks`);
await drop('milestones', () => sql`DELETE FROM milestones`);
await drop('capacity_weeks', () => sql`DELETE FROM capacity_weeks`);
await drop('project_metadata', () => sql`DELETE FROM project_metadata`);

console.log('✓ All data cleared. Restart npm run dev to re-seed with fresh data.');
process.exit(0);
