import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, or } from 'drizzle-orm';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { db } from '@/db';
import { authors, brands, articles } from '@/db/schema';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const rows = await db.select({ slug: authors.slug }).from(authors).where(eq(authors.isActive, true));
  return rows.map((r) => ({ slug: r.slug }));
}

async function getAuthor(slug: string) {
  const [a] = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
  return a;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author || !author.isActive) return { title: 'Not found' };
  const description = author.credentials ?? author.title ?? `${author.name}, BettingBonuses.com`;
  return {
    title: `${author.name}${author.title ? ` — ${author.title}` : ''}`,
    description,
    alternates: { canonical: `/authors/${author.slug}/` },
  };
}

const MARKDOWN_CLASS =
  'max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6';

export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author || !author.isActive) notFound();

  const [reviewedBrands, writtenArticles] = await Promise.all([
    db
      .select({ slug: brands.slug, name: brands.name })
      .from(brands)
      .where(and(eq(brands.status, 'active'), or(eq(brands.primaryAuthorId, author.id), eq(brands.secondaryAuthorId, author.id))))
      .orderBy(brands.name),
    db
      .select({ slug: articles.slug, title: articles.title })
      .from(articles)
      .where(and(eq(articles.status, 'published'), or(eq(articles.primaryAuthorId, author.id), eq(articles.secondaryAuthorId, author.id))))
      .orderBy(articles.title),
  ]);

  return (
    <div className="py-8">
      <div className="flex items-center gap-4">
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static avatar
          <img src={author.avatarUrl} alt={author.name} className="size-16 rounded-full object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
            {author.name.charAt(0)}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{author.name}</h1>
          {author.title ? <p className="text-muted-foreground">{author.title}</p> : null}
        </div>
      </div>

      {author.credentials ? (
        <p className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">{author.credentials}</p>
      ) : null}

      {author.bio ? (
        <div className={`mt-6 ${MARKDOWN_CLASS}`}>
          <Markdown rehypePlugins={[rehypeSanitize]}>{author.bio}</Markdown>
        </div>
      ) : null}

      {reviewedBrands.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Brands reviewed by {author.name}</h2>
          <ul className="flex flex-wrap gap-2">
            {reviewedBrands.map((b) => (
              <li key={b.slug}>
                <Link href={`/${b.slug}/`} className="inline-block rounded-md border px-2.5 py-1 text-sm hover:bg-muted">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {writtenArticles.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Articles by {author.name}</h2>
          <ul className="flex flex-col gap-2">
            {writtenArticles.map((a) => (
              <li key={a.slug}>
                <Link href={`/${a.slug}/`} className="text-primary hover:underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
