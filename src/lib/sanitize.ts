import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize admin-authored HTML (Tiptap output) for public rendering: allow a
 * safe subset of tags + img with size attrs; strip scripts, event handlers, and
 * non-http(s)/relative URLs. Server-only (isomorphic-dompurify uses jsdom on
 * the server).
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'h2', 'h3', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|\/)/i,
  });
}
