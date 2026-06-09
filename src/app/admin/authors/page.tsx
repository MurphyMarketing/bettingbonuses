import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { authors, brands, articles } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { AuthorsTable } from './authors-table';

export const metadata: Metadata = { title: 'Authors', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AuthorsListPage() {
  const rows = await db
    .select({
      id: authors.id,
      name: authors.name,
      slug: authors.slug,
      title: authors.title,
      isActive: authors.isActive,
      displayOrder: authors.displayOrder,
      avatarUrl: authors.avatarUrl,
      fullBio: authors.fullBio,
      yearsExperience: authors.yearsExperience,
      socialCount: sql<number>`((${authors.linkedinUrl} is not null)::int + (${authors.twitterUrl} is not null)::int + (${authors.websiteUrl} is not null)::int + (${authors.email} is not null)::int)`,
      // Qualify the outer authors.id so it isn't shadowed by brands.id/articles.id in the subquery.
      brandCount: sql<number>`(select count(*)::int from ${brands} where ${brands.primaryAuthorId} = ${sql.raw('"authors"."id"')} or ${brands.secondaryAuthorId} = ${sql.raw('"authors"."id"')})`,
      articleCount: sql<number>`(select count(*)::int from ${articles} where ${articles.primaryAuthorId} = ${sql.raw('"authors"."id"')} or ${articles.secondaryAuthorId} = ${sql.raw('"authors"."id"')})`,
    })
    .from(authors)
    .orderBy(asc(authors.displayOrder), asc(authors.name));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Authors</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button render={<Link href="/admin/authors/new">New author</Link>} />
      </div>

      <AuthorsTable rows={rows} />
    </main>
  );
}
