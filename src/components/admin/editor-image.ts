import { uploadArticleImage } from '@/app/admin/articles/actions';

/**
 * Shared editor image upload — reuses the article image pipeline (uploads to the
 * article-images Supabase bucket, returns a public URL). Used by every rich-content
 * editor (articles, brands, page content) so there's a single image pipeline.
 */
export async function uploadEditorImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.set('file', file);
  const res = await uploadArticleImage(fd);
  if (res.error) {
    window.alert(res.error);
    return null;
  }
  return res.url ?? null;
}
