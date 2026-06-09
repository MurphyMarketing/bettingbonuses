import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { articles, authors } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/datetime';
import { ArticlesTable, type ArticleRow } from './articles-table';

export const metadata: Metadata = { title: 'Articles', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ArticlesListPage() {
  const raw = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      category: articles.category,
      status: articles.status,
      readingTimeMinutes: articles.readingTimeMinutes,
      updatedAt: articles.updatedAt,
      authorName: authors.name,
    })
    .from(articles)
    .leftJoin(authors, eq(articles.primaryAuthorId, authors.id))
    .orderBy(desc(articles.updatedAt));

  const rows: ArticleRow[] = raw.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    category: a.category,
    status: a.status,
    readingTimeMinutes: a.readingTimeMinutes,
    authorName: a.authorName,
    updatedAt: a.updatedAt,
    updatedRelative: formatRelativeTime(a.updatedAt),
  }));

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button render={<Link href="/admin/articles/new">New article</Link>} />
      </div>

      <ArticlesTable rows={rows} />
    </main>
  );
}
