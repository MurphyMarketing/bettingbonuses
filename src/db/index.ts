import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Runtime uses the Supabase transaction pooler (DATABASE_URL, port 6543).
// PgBouncer in transaction mode doesn't support prepared statements, so
// disable them with prepare: false.
const client = postgres(process.env.DATABASE_URL!, { max: 10, prepare: false });
export const db = drizzle(client, { schema });
