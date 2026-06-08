/**
 * Slug helpers. Slugs are lowercase-with-hyphens, URL-safe, unique within their
 * table (see CLAUDE.md conventions). Pure functions — safe on client and server.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Derive a URL-safe slug from arbitrary text. May return '' for input with no
 *  alphanumerics (caller should treat '' as "could not derive"). */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
