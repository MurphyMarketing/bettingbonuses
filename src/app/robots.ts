import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.bettingbonuses.com';

export default function robots(): MetadataRoute.Robots {
  const host = process.env.NEXTAUTH_URL ?? '';
  const isPreview = host.includes('vercel.app') || host.includes('localhost');

  // Preview / dev: keep everything out of the index.
  if (isPreview) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  // Production: allow public pages; keep admin/api/go out.
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/go/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
