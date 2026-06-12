/**
 * Normalize a redirect `from_path` to the exact form the proxy receives.
 *
 * next.config has no `trailingSlash` key, so Next uses the default (`false`):
 * it 308-redirects any path with a trailing slash to the slash-less form BEFORE
 * the proxy/redirect layer runs. A `from_path` stored *with* a trailing slash
 * therefore never matches — the request has already been normalized to no-slash
 * by the time the proxy looks it up.
 *
 * So every stored `from_path` must be in the slash-less form. Root ("/") is the
 * one path Next keeps as-is, so it's preserved here too.
 *
 * NOTE: only `from_path` is normalized. `to_path` is left as authored (e.g.
 * "/sportsbooks/") so it can point at a page's declared canonical; the single
 * trailing-slash 308 on the destination is Next's standard, site-wide behavior.
 */
export function normalizeRedirectFromPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed === '/') return '/';
  return trimmed.replace(/\/+$/, '') || '/';
}
