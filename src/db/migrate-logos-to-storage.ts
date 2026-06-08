/**
 * One-off: migrate any logos committed under /public/logos into the Supabase
 * Storage `brand-logos` bucket and repoint brand rows at the public URLs.
 *
 *   npm run migrate-logos
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local. Safe to
 * re-run (createBucket ignores "already exists"; uploads upsert). After a clean
 * run you can delete /public/logos.
 */
import { loadEnvConfig } from '@next/env';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const EXT_MIME: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp' };

async function main() {
  loadEnvConfig(process.cwd());
  const { getStorage, logoPublicUrl, LOGO_BUCKET } = await import('@/lib/storage');
  const { db } = await import('@/db');
  const { brands } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const storage = getStorage();
  const { error: bucketErr } = await storage.createBucket(LOGO_BUCKET, { public: true });
  if (bucketErr && !/already exists/i.test(bucketErr.message)) throw bucketErr;
  console.log(`bucket "${LOGO_BUCKET}" ready`);

  const dir = path.join(process.cwd(), 'public', 'logos');
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    console.log('no /public/logos directory — nothing to migrate');
    process.exit(0);
  }

  for (const file of files) {
    const ext = file.split('.').pop()!.toLowerCase();
    const contentType = EXT_MIME[ext];
    if (!contentType) {
      console.log(`skip ${file} (unsupported type)`);
      continue;
    }
    const buf = await readFile(path.join(dir, file));
    const { error } = await storage.from(LOGO_BUCKET).upload(file, buf, { contentType, upsert: true });
    if (error) {
      console.log(`FAILED ${file}: ${error.message}`);
      continue;
    }
    const publicUrl = `${logoPublicUrl(file)}?v=${Date.now()}`;
    // filename -> brand slug: strip extension and any "-square" suffix.
    const base = file.replace(/\.[^.]+$/, '');
    const isSquare = base.endsWith('-square');
    const slug = isSquare ? base.replace(/-square$/, '') : base;
    const col = isSquare ? { logoSquareUrl: publicUrl } : { logoUrl: publicUrl };
    const res = await db.update(brands).set({ ...col, updatedAt: new Date() }).where(eq(brands.slug, slug)).returning({ id: brands.id });
    console.log(`uploaded ${file} -> ${publicUrl}  (brand ${slug}: ${res.length ? 'updated' : 'no match'})`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
