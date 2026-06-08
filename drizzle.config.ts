import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

// drizzle-kit doesn't read .env.local on its own. Load it exactly the way
// Next.js does so DIRECT_URL resolves consistently with the runtime.
loadEnvConfig(process.cwd());

// Migrations and schema diffing use the Supabase DIRECT connection (port 5432),
// NOT the transaction pooler — drizzle-kit needs a non-pooled session connection.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
});
