import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { type NeonQueryFunction } from '@neondatabase/serverless';

type Sql = NeonQueryFunction<false, false>;

export const SESSION_COOKIE = 'ld_session';
const SESSION_DAYS = 14;

export type Role = 'Admin' | 'Owner' | 'Contributor' | 'Viewer';

export interface SessionUser {
  userId: number;
  email: string;
  name: string;
  role: Role;
}

// ── Secret ──────────────────────────────────────────────────────────────────────
function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  // Fallback so the app still runs without extra setup; warn loudly.
  // For real deployments set AUTH_SECRET to a long random string.
  const fallback = process.env.POSTGRES_URL;
  if (fallback) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[auth] AUTH_SECRET not set — falling back to a derived secret. Set AUTH_SECRET for production.');
    }
    return `derived:${fallback}`;
  }
  throw new Error('AUTH_SECRET (or POSTGRES_URL) must be set to sign sessions.');
}

// ── Password hashing (scrypt) ─────────────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

// ── Session token (HMAC-signed, stateless) ────────────────────────────────────────
function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signToken(user: SessionUser): string {
  const payload = { ...user, exp: Date.now() + SESSION_DAYS * 86400000 };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** Pure verification — safe to call from proxy.ts (no next/headers dependency). */
export function verifyToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return { userId: payload.userId, email: payload.email, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86400;

// ── Users table + bootstrap admin ─────────────────────────────────────────────────
export async function ensureUsersTable(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(160) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Contributor',
    must_reset BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  const email = (process.env.ADMIN_EMAIL ?? 'allen.jones@fusionehr.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (password) {
    // ADMIN_PASSWORD set → upsert the admin account and sync the password.
    // This doubles as a password-reset mechanism: set ADMIN_PASSWORD, restart, sign in, then clear it.
    const hashed = hashPassword(password);
    await sql`
      INSERT INTO users (email, name, password_hash, role, must_reset)
      VALUES (${email}, ${'Administrator'}, ${hashed}, ${'Admin'}, ${false})
      ON CONFLICT (email) DO UPDATE
        SET password_hash = ${hashed}, must_reset = false, role = 'Admin', active = true
    `;
    console.log(`[auth] Admin account synced from ADMIN_PASSWORD: ${email}`);
  } else {
    // No ADMIN_PASSWORD → only bootstrap if the table is completely empty.
    const count = await sql`SELECT COUNT(*)::int AS n FROM users`;
    if ((count[0]?.n ?? 0) === 0) {
      console.warn('[auth] No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local to create the first admin.');
    }
  }
}
