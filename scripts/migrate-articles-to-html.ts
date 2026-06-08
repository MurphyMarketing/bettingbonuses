/**
 * One-off: convert articles.body from Markdown to HTML (we now store HTML).
 *   npm run migrate-articles-to-html
 * Idempotent-ish: marked on already-HTML is largely a no-op for our content.
 * Run once after the editor switch.
 */
import { loadEnvConfig } from '@next/env';
import { marked } from 'marked';

async function main() {
  loadEnvConfig(process.cwd());
  const { db } = await import('@/db');
  const { articles } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const rows = await db.select({ id: articles.id, slug: articles.slug, body: articles.body }).from(articles);
  if (rows.length === 0) {
    console.log('no articles to migrate');
    process.exit(0);
  }

  let converted = 0;
  for (const a of rows) {
    if (!a.body || !a.body.trim()) continue;
    const html = await marked.parse(a.body, { async: true });
    await db.update(articles).set({ body: html, updatedAt: new Date() }).where(eq(articles.id, a.id));
    converted++;
    console.log(`converted ${a.slug}`);
  }
  console.log(`done — converted ${converted}/${rows.length} article bodies`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
