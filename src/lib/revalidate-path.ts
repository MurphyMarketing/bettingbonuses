import { revalidatePath } from 'next/cache';

/**
 * Revalidate a PUBLIC route by its canonical cache key.
 *
 * next.config has no `trailingSlash` key, so Next uses the default (`false`):
 * public pages are served/cached WITHOUT a trailing slash (the slash form
 * 308-redirects). A `revalidatePath('/foo/')` call therefore targets a key that
 * doesn't match the cached `/foo` entry and silently no-ops, leaving stale HTML.
 *
 * This strips any trailing slash (root `/` preserved) so the key matches the
 * cached entry — the revalidation analogue of the redirect-path normalization
 * in src/lib/redirect-path.ts. Every admin action's public-route revalidation
 * goes through here.
 */
export function revalidatePublic(path: string): void {
  const trimmed = path.trim();
  const canonical = trimmed === '/' ? '/' : trimmed.replace(/\/+$/, '') || '/';
  revalidatePath(canonical);
}
