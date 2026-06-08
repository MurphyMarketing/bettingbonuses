import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, or } from 'drizzle-orm';
import { Briefcase, AtSign, Globe, Mail } from 'lucide-react';
import { db } from '@/db';
import { authors, brands, articles } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { sanitizeHtml } from '@/lib/sanitize';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = 'https://www.bettingbonuses.com';
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

const BIO_CLASS =
  'max-w-2xl text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_h2]:mt-5 [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground';

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

  const sameAs = [author.linkedinUrl, author.twitterUrl, author.websiteUrl].filter((u): u is string => Boolean(u));
  const socials: { href: string; icon: typeof Globe; label: string; mail?: boolean }[] = [];
  if (author.linkedinUrl) socials.push({ href: author.linkedinUrl, icon: Briefcase, label: 'LinkedIn' });
  if (author.twitterUrl) socials.push({ href: author.twitterUrl, icon: AtSign, label: 'X / Twitter' });
  if (author.websiteUrl) socials.push({ href: author.websiteUrl, icon: Globe, label: 'Website' });
  if (author.email) socials.push({ href: `mailto:${author.email}`, icon: Mail, label: 'Email', mail: true });

  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `${SITE_URL}/authors/${author.slug}/`,
    ...(author.title ? { jobTitle: author.title } : {}),
    ...(author.credentials ? { description: author.credentials } : {}),
    ...(author.avatarUrl ? { image: author.avatarUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(author.expertiseAreas?.length ? { knowsAbout: author.expertiseAreas } : {}),
    worksFor: { '@type': 'Organization', name: 'BettingBonuses.com', url: SITE_URL },
  };
  const jsonLd = JSON.stringify(personLd).replace(/</g, '\\u003c');

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* Header */}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static avatar
          <img src={author.avatarUrl} alt={author.name} className="size-[120px] shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-[120px] shrink-0 items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground">
            {author.name.charAt(0)}
          </span>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{author.name}</h1>
          {author.title ? <p className="mt-1 text-lg text-muted-foreground">{author.title}</p> : null}
          {author.yearsExperience ? (
            <p className="mt-1 text-sm text-muted-foreground">Industry experience since {author.yearsExperience}</p>
          ) : null}
          {author.expertiseAreas?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {author.expertiseAreas.map((area) => (
                <Badge key={area} variant="outline">{area}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Social / contact */}
      {socials.length ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              {...(s.mail ? {} : { target: '_blank', rel: 'me noopener noreferrer' })}
              className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <s.icon className="size-4" />
            </a>
          ))}
        </div>
      ) : null}

      {author.credentials ? (
        <p className="mt-6 rounded-md border bg-muted/30 p-3 text-sm">{author.credentials}</p>
      ) : null}

      {/* Bio: full_bio (HTML) preferred, else short bio */}
      {author.fullBio ? (
        <div className={`mt-6 ${BIO_CLASS}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(author.fullBio) }} />
      ) : author.bio ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{author.bio}</p>
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
