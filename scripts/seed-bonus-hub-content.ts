/**
 * Seed one page_content row per bonus-type hub (label only; bodies empty, like the
 * category hubs). Idempotent — ON CONFLICT DO NOTHING never overwrites admin edits.
 * No schema change (page_content already has every column).
 *
 * Run: npx tsx scripts/seed-bonus-hub-content.ts
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

const ROWS: { pageKey: string; label: string }[] = [
  { pageKey: 'bonus-bets', label: 'Bonus bets hub' },
  { pageKey: 'no-deposit-bonuses', label: 'No-deposit bonuses hub' },
  { pageKey: 'odds-boosts', label: 'Odds boosts hub' },
  { pageKey: 'cashback', label: 'Cashback hub' },
  { pageKey: 'deposit-bonus', label: 'Deposit match hub' },
  { pageKey: 'bet-insurance', label: 'Bet insurance hub' },
];

async function main() {
  const { db } = await import('../src/db');
  const { pageContent } = await import('../src/db/schema');
  const res = await db.insert(pageContent).values(ROWS).onConflictDoNothing({ target: pageContent.pageKey });
  console.log(`Seeded bonus-hub page_content (${ROWS.length} candidates).`, res.count ?? '');
  const { inArray } = await import('drizzle-orm');
  const present = await db
    .select({ pageKey: pageContent.pageKey, label: pageContent.label })
    .from(pageContent)
    .where(inArray(pageContent.pageKey, ROWS.map((r) => r.pageKey)));
  for (const r of present) console.log(`  ${r.pageKey} -> "${r.label}"`);
  process.exit(0);
}

main();
