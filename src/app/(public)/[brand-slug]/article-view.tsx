import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { articles, authors } from '@/db/schema';
import { AuthorByline, type BylineAuthor } from '@/components/author-byline';
import { sanitizeHtml } from '@/lib/sanitize';

type Article = typeof articles.$inferSelect;

const BODY_CLASS =
  'max-w-none leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:mt-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:my-4 [&_img]:rounded-lg [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_pre]:my-4 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5';

/** Published article by slug, or null. */
export async function getPublishedArticle(slug: string): Promise<Article | null> {
  const [a] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  if (!a || a.status !== 'published') return null;
  return a;
}

export function articleMetadata(article: Article): Metadata {
  const description = article.metaDescription ?? article.excerpt ?? `${article.title} — BettingBonuses.com`;
  return {
    title: article.title,
    description,
    alternates: { canonical: `/${article.slug}/` },
    openGraph: { title: article.title, description, url: `/${article.slug}/`, type: 'article' },
  };
}

export async function ArticleView({ article }: { article: Article }) {
  const ids = [article.primaryAuthorId, article.secondaryAuthorId].filter((x): x is string => Boolean(x));
  const authorRows = ids.length
    ? await db
        .select({ id: authors.id, slug: authors.slug, name: authors.name, title: authors.title, avatarUrl: authors.avatarUrl, yearsExperience: authors.yearsExperience })
        .from(authors)
        .where(inArray(authors.id, ids))
    : [];

  const byline: BylineAuthor[] = [article.primaryAuthorId, article.secondaryAuthorId]
    .map((id) => authorRows.find((a) => a.id === id))
    .filter((a): a is (typeof authorRows)[number] => Boolean(a))
    .map((a) => ({ slug: a.slug, name: a.name, title: a.title, avatarUrl: a.avatarUrl, yearsExperience: a.yearsExperience }));

  const primary = byline[0];
  const publishedOn = article.publishedAt
    ? article.publishedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <article className="py-8">
      <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>

      {/* Top byline */}
      {primary || publishedOn || article.readingTimeMinutes ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {primary ? (
            <>
              By{' '}
              <Link href={`/authors/${primary.slug}/`} className="font-medium text-foreground hover:underline">
                {primary.name}
              </Link>
            </>
          ) : null}
          {publishedOn ? <> · {publishedOn}</> : null}
          {article.readingTimeMinutes ? <> · {article.readingTimeMinutes} min read</> : null}
        </p>
      ) : null}

      {article.excerpt ? <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{article.excerpt}</p> : null}

      {article.body ? (
        <div
          className={`mt-8 ${BODY_CLASS}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body) }}
        />
      ) : null}

      <AuthorByline authors={byline} label="Written by" />
    </article>
  );
}
