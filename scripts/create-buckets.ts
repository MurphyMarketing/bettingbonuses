/**
 * One-off: ensure the public Supabase Storage buckets exist.
 *   npm run create-buckets
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Safe to re-run.
 */
import { loadEnvConfig } from '@next/env';

async function main() {
  loadEnvConfig(process.cwd());
  const { getStorage, LOGO_BUCKET, ARTICLE_IMAGE_BUCKET } = await import('@/lib/storage');
  const storage = getStorage();

  for (const bucket of [LOGO_BUCKET, ARTICLE_IMAGE_BUCKET]) {
    const { error } = await storage.createBucket(bucket, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
    console.log(`bucket "${bucket}": ${error ? 'already exists' : 'created'}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
