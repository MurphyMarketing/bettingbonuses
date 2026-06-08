import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { redirects } from '@/db/schema';

/**
 * In-memory cache of active redirects, refreshed at most once per TTL so the
 * proxy doesn't hit the DB on every request. Best-effort invalidation on admin
 * save; the TTL bounds staleness (and covers multi-instance serverless).
 */
type RedirectTarget = { toPath: string; statusCode: number };

const TTL_MS = 60_000;
let cache: Map<string, RedirectTarget> | null = null;
let cachedAt = 0;
let inflight: Promise<Map<string, RedirectTarget>> | null = null;

async function load(): Promise<Map<string, RedirectTarget>> {
  const rows = await db
    .select({ fromPath: redirects.fromPath, toPath: redirects.toPath, statusCode: redirects.statusCode })
    .from(redirects)
    .where(eq(redirects.isActive, true));
  return new Map(rows.map((r) => [r.fromPath, { toPath: r.toPath, statusCode: r.statusCode }]));
}

export async function getActiveRedirects(): Promise<Map<string, RedirectTarget>> {
  const now = Date.now();
  if (cache && now - cachedAt < TTL_MS) return cache;
  if (inflight) return inflight; // coalesce concurrent refreshes
  inflight = load()
    .then((m) => {
      cache = m;
      cachedAt = Date.now();
      return m;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateRedirectsCache(): void {
  cache = null;
  cachedAt = 0;
}
