/**
 * Seed 301 redirects for the legacy /[category]/promo-codes URLs now that the
 * bare /[category]/ root is the canonical category hub.
 *
 * from_path is stored in the slash-less form the proxy actually receives (Next's
 * default trailingSlash strips the slash before the proxy runs — see
 * src/lib/redirect-path.ts). This script also removes any stale trailing-slash
 * variant rows from earlier runs so each category has exactly one firing row.
 *
 * Idempotent. Run: npx tsx scripts/seed-category-redirects.ts
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

const CATEGORY_SLUGS = ['sportsbooks', 'prediction-markets', 'horse-racing', 'dfs'];

async function main() {
  const { inArray } = await import('drizzle-orm');
  const { db } = await import('../src/db');
  const { redirects } = await import('../src/db/schema');
  const { normalizeRedirectFromPath } = await import('../src/lib/redirect-path');

  // Drop the redundant trailing-slash variants seeded before normalization.
  const staleSlashVariants = CATEGORY_SLUGS.map((slug) => `/${slug}/promo-codes/`);
  const deleted = await db.delete(redirects).where(inArray(redirects.fromPath, staleSlashVariants)).returning({ id: redirects.id });
  if (deleted.length) console.log(`Removed ${deleted.length} stale trailing-slash variant rows.`);

  const rows = CATEGORY_SLUGS.map((slug) => ({
    fromPath: normalizeRedirectFromPath(`/${slug}/promo-codes/`), // -> /<slug>/promo-codes
    toPath: `/${slug}/`,
    statusCode: 301,
    notes: 'Category hub consolidated to bare /[category]/ root',
  }));

  const result = await db.insert(redirects).values(rows).onConflictDoNothing({ target: redirects.fromPath });
  console.log(`Upserted ${rows.length} normalized category redirects.`, result.count ?? '');

  const all = await db
    .select({ from: redirects.fromPath, to: redirects.toPath, code: redirects.statusCode, active: redirects.isActive })
    .from(redirects);
  console.log('Redirect rows now in table:');
  for (const r of all) console.log(`  ${r.from} -> ${r.to} [${r.code}${r.active ? '' : ' INACTIVE'}]`);
  process.exit(0);
}

main();
