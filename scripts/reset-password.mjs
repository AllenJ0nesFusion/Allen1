#!/usr/bin/env node
// Reset a user's password directly in the database.
// Usage: node scripts/reset-password.mjs <email> <new-password>
//
// Reads POSTGRES_URL from .env.local (same as the app).

import { scryptSync, randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/reset-password.mjs <email> <new-password>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

// ── Load env ─────────────────────────────────────────────────────────────────
const envPath = join(process.cwd(), '.env.local');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf8');
} catch {
  console.error('Could not read .env.local — run this from the project root.');
  process.exit(1);
}
const match = envContent.match(/POSTGRES_URL=(.+)/);
if (!match) {
  console.error('POSTGRES_URL not found in .env.local');
  process.exit(1);
}
const POSTGRES_URL = match[1].trim();

// ── Hash (matches lib/auth.ts hashPassword) ───────────────────────────────────
function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// ── Run ───────────────────────────────────────────────────────────────────────
const sql = neon(POSTGRES_URL);

const users = await sql`SELECT id, email, name FROM users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`;
if (users.length === 0) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

const user = users[0];
const hashed = hashPassword(password);

await sql`
  UPDATE users
  SET password_hash = ${hashed}, must_reset = false
  WHERE id = ${user.id}
`;

console.log(`✓ Password reset for ${user.name || user.email} (id=${user.id})`);
console.log('  They can now sign in with the new password.');
