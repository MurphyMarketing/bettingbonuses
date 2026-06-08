import { after } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { affiliateLinks } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [link] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.slug, slug)).limit(1);

  const now = new Date();
  if (!link || !link.isActive || (link.validTo && link.validTo.getTime() < now.getTime())) {
    return new Response('Not found', { status: 404 });
  }

  // Fire-and-forget click tracking — runs after the response is sent, never
  // blocks the redirect (after() works on serverless too, unlike a bare promise).
  after(async () => {
    await db
      .update(affiliateLinks)
      .set({ clickCount: sql`${affiliateLinks.clickCount} + 1`, lastClickedAt: now })
      .where(eq(affiliateLinks.id, link.id));
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.destinationUrl,
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    },
  });
}
