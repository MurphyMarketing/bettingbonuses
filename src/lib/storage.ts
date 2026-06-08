import { StorageClient } from '@supabase/storage-js';

/**
 * Supabase Storage (storage-only client — NOT @supabase/supabase-js — to stay
 * portable per CLAUDE.md). Uses the service-role key, so this module is
 * SERVER-ONLY; never import it into a client component.
 */
export const LOGO_BUCKET = 'brand-logos';
export const ARTICLE_IMAGE_BUCKET = 'article-images';

function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Storage uploads.');
  }
  return { url, key };
}

export function getStorage(): StorageClient {
  const { url, key } = env();
  return new StorageClient(`${url}/storage/v1`, {
    apikey: key,
    Authorization: `Bearer ${key}`,
  });
}

/** Public URL for an object in any public bucket. */
export function publicUrl(bucket: string, objectPath: string): string {
  const { url } = env();
  return `${url}/storage/v1/object/public/${bucket}/${objectPath}`;
}

/** Public URL for an object in the brand-logos bucket. */
export function logoPublicUrl(objectPath: string): string {
  return publicUrl(LOGO_BUCKET, objectPath);
}
