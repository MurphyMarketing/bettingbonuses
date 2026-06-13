import { sanitizeHtml } from '@/lib/sanitize';

/**
 * Renders an admin-authored rich HTML slot (Tiptap output) — the same content
 * format + sanitize path the article body uses. Empty/blank renders nothing.
 * Used for the brand and hub/index page intro_body / body slots.
 */
const RICH_CLASS =
  'max-w-none leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:mt-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:my-4 [&_img]:rounded-lg [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_pre]:my-4 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5';

export function RichContent({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html || !html.trim()) return null;
  return (
    <div
      className={className ? `${RICH_CLASS} ${className}` : RICH_CLASS}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
