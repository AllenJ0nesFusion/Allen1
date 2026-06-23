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

try {
  await sql`DELETE FROM project_metadata WHERE id = 1`;
  console.log('✓ Seed flag cleared. Restart npm run dev to re-seed.');
} catch (e) {
  console.log('Table does not exist yet — no action needed. Just restart npm run dev.');
}
process.exit(0);
