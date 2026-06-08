import { handlers } from '@/auth';

// Node runtime (default) — Auth.js uses the Drizzle/postgres-js adapter, which
// can't run on the edge. No edge runtime anywhere in this app (Kinsta).
export const { GET, POST } = handlers;
