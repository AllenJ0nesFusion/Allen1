import { neon } from '@neondatabase/serverless';

export function getDb() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('POSTGRES_URL environment variable is not set');
  return neon(connectionString);
}
