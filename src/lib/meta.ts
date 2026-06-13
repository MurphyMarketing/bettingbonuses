/**
 * Per-page SEO override resolution: use the admin override when it's non-blank,
 * otherwise the existing template-generated default. Empty string and null are
 * treated identically (both fall back), so a cleared field is a no-op.
 */
export function metaOrDefault(override: string | null | undefined, fallback: string): string {
  const v = override?.trim();
  return v ? v : fallback;
}
