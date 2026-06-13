/**
 * Seed page_content rows for the legal/utility pages with PLACEHOLDER body copy.
 * Idempotent — ON CONFLICT DO NOTHING never overwrites once the owner edits them.
 * No schema change.
 *
 * IMPORTANT: the body copy below is PLACEHOLDER ONLY. The affiliate disclosure,
 * privacy policy, and responsible-gambling text must reflect the owner's actual
 * practices/obligations and will be replaced by the owner via /admin/page-content.
 *
 * Run: npx tsx scripts/seed-legal-page-content.ts
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

const PLACEHOLDER = '<p><strong>[PLACEHOLDER — replace this with reviewed copy. This is stub text, not legal advice.]</strong></p>';

const ROWS: { pageKey: string; label: string; body: string }[] = [
  {
    pageKey: 'affiliate-disclosure',
    label: 'Affiliate disclosure',
    body:
      PLACEHOLDER +
      '<h2>How we make money</h2><p>[Placeholder] BettingBonuses.com participates in affiliate programs and may earn a commission when you sign up with an operator through our links.</p>' +
      '<h2>Editorial independence</h2><p>[Placeholder] Affiliate relationships do not influence our rankings, ratings, or reviews.</p>' +
      '<h2>FTC disclosure</h2><p>[Placeholder] This site contains affiliate links as described by the FTC.</p>',
  },
  {
    pageKey: 'privacy-policy',
    label: 'Privacy policy',
    body:
      PLACEHOLDER +
      '<h2>Information we collect</h2><p>[Placeholder]</p>' +
      '<h2>How we use information</h2><p>[Placeholder]</p>' +
      '<h2>Cookies and analytics</h2><p>[Placeholder]</p>' +
      '<h2>Third-party services</h2><p>[Placeholder]</p>' +
      '<h2>Your choices and rights</h2><p>[Placeholder]</p>' +
      '<h2>Contact</h2><p>[Placeholder]</p>',
  },
  {
    pageKey: 'responsible-gambling',
    label: 'Responsible gambling',
    body:
      PLACEHOLDER +
      '<h2>Bet responsibly</h2><p>[Placeholder] 21+. Betting should be entertainment, not a way to make money.</p>' +
      '<h2>Warning signs</h2><p>[Placeholder]</p>' +
      '<h2>Tools that can help</h2><p>[Placeholder] Deposit limits, time-outs, and self-exclusion offered by licensed operators.</p>' +
      '<h2>Where to get help</h2><p>[Placeholder] National Problem Gambling Helpline: 1-800-GAMBLER (1-800-426-2537).</p>',
  },
  {
    pageKey: 'contact',
    label: 'Contact',
    body:
      PLACEHOLDER +
      '<h2>Get in touch</h2><p>[Placeholder] Email: <a href="mailto:hello@example.com">hello@example.com</a></p>' +
      '<p>[Placeholder] Replace with the real contact email/details. We aim to respond within a few business days.</p>',
  },
];

async function main() {
  const { db } = await import('../src/db');
  const { pageContent } = await import('../src/db/schema');
  const { inArray } = await import('drizzle-orm');
  const res = await db.insert(pageContent).values(ROWS).onConflictDoNothing({ target: pageContent.pageKey });
  console.log(`Seeded legal page_content (${ROWS.length} candidates).`, res.count ?? '');
  const present = await db
    .select({ pageKey: pageContent.pageKey, label: pageContent.label })
    .from(pageContent)
    .where(inArray(pageContent.pageKey, ROWS.map((r) => r.pageKey)));
  for (const r of present) console.log(`  ${r.pageKey} -> "${r.label}"`);
  process.exit(0);
}

main();
