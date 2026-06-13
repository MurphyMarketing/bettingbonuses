import type { Metadata } from 'next';
import { RichContent } from '@/components/rich-content';
import { getPageContent, getPageMeta } from '@/lib/page-content';
import { metaOrDefault } from '@/lib/meta';

/**
 * Legal / utility pages (affiliate disclosure, privacy policy, responsible
 * gambling, contact) — flat top-level, page_content-backed and admin-editable in
 * /admin/page-content, reusing the same stack as the hubs (RichContent +
 * meta override). Resolved as a step of the root [brand-slug] fallback chain.
 * Body copy is seeded as PLACEHOLDER and owned/replaced by the site owner.
 */
export const STATIC_PAGES: Record<string, { h1: string; description: string }> = {
  'affiliate-disclosure': {
    h1: 'Affiliate Disclosure',
    description: 'How BettingBonuses.com earns affiliate commissions and how that does (and does not) affect our content.',
  },
  'privacy-policy': {
    h1: 'Privacy Policy',
    description: 'How BettingBonuses.com collects, uses, and protects your information.',
  },
  'responsible-gambling': {
    h1: 'Responsible Gambling',
    description: 'Responsible gambling resources, tools, and support. 21+. Please gamble responsibly.',
  },
  contact: {
    h1: 'Contact Us',
    description: 'Get in touch with the BettingBonuses.com editorial team.',
  },
};

/** True if the slug is one of the legal/utility pages. */
export function isStaticPageSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(STATIC_PAGES, slug);
}

/** Metadata for a legal/utility page (page_content override + template fallback). */
export async function staticPageMetadata(slug: string): Promise<Metadata | null> {
  const cfg = STATIC_PAGES[slug];
  if (!cfg) return null;
  const meta = await getPageMeta(slug);
  const title = metaOrDefault(meta.metaTitle, cfg.h1);
  const description = metaOrDefault(meta.metaDescription, cfg.description);
  return {
    title,
    description,
    alternates: { canonical: `/${slug}/` },
    openGraph: { title, description, url: `/${slug}/`, type: 'website' },
  };
}

export async function StaticContentPage({ slug }: { slug: string }) {
  const cfg = STATIC_PAGES[slug];
  if (!cfg) return null; // caller guards with isStaticPageSlug; defensive only
  const pc = await getPageContent(slug);

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold tracking-tight">{cfg.h1}</h1>
      <RichContent html={pc.introBody} className="mt-6 max-w-3xl" />
      <RichContent html={pc.body} className="mt-6 max-w-3xl" />
      {!pc.introBody && !pc.body ? (
        <p className="mt-6 max-w-3xl text-muted-foreground">Content coming soon.</p>
      ) : null}
    </div>
  );
}
