import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, desc, eq, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { articles, authors } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  articleCategoryLabel,
  articleStatusLabel,
  ARTICLE_STATUS_BADGE_VARIANT,
  ARTICLE_STATUS_LABELS,
  ARTICLE_CATEGORY_LABELS,
} from './labels';
import { ARTICLE_CATEGORY_VALUES, ARTICLE_STATUS_VALUES } from './schema';

export const metadata: Metadata = { title: 'Articles', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));

export default async function ArticlesListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const statusFilter = first(sp.status);
  const categoryFilter = first(sp.category);
  const authorFilter = first(sp.author);

  const conditions: SQL[] = [];
  if ((ARTICLE_STATUS_VALUES as readonly string[]).includes(statusFilter)) {
    conditions.push(eq(articles.status, statusFilter as (typeof ARTICLE_STATUS_VALUES)[number]));
  }
  if ((ARTICLE_CATEGORY_VALUES as readonly string[]).includes(categoryFilter)) {
    conditions.push(eq(articles.category, categoryFilter as (typeof ARTICLE_CATEGORY_VALUES)[number]));
  }
  if (authorFilter) conditions.push(eq(articles.primaryAuthorId, authorFilter));

  const [rows, authorRows] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        category: articles.category,
        status: articles.status,
        readingTimeMinutes: articles.readingTimeMinutes,
        publishedAt: articles.publishedAt,
        authorName: authors.name,
      })
      .from(articles)
      .leftJoin(authors, eq(articles.primaryAuthorId, authors.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(articles.updatedAt)),
    db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(asc(authors.name)),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="text-sm text-muted-foreground">{rows.length} shown</p>
        </div>
        <Button render={<Link href="/admin/articles/new">New article</Link>} />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select name="status" defaultValue={statusFilter} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">All</option>
            {Object.entries(ARTICLE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Category</span>
          <select name="category" defaultValue={categoryFilter} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">All</option>
            {Object.entries(ARTICLE_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Author</span>
          <select name="author" defaultValue={authorFilter} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">All</option>
            {authorRows.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <Button type="submit" variant="outline">Filter</Button>
        <Link href="/admin/articles" className="text-sm text-muted-foreground hover:underline">Clear</Link>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Read</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No articles match these filters.</TableCell></TableRow>
            ) : (
              rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/admin/articles/${a.id}/edit`} className="font-medium hover:underline">{a.title}</Link>
                    <span className="block text-xs text-muted-foreground">/{a.slug}</span>
                  </TableCell>
                  <TableCell>{articleCategoryLabel(a.category)}</TableCell>
                  <TableCell>{a.authorName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={ARTICLE_STATUS_BADGE_VARIANT[a.status] ?? 'secondary'}>{articleStatusLabel(a.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {a.readingTimeMinutes ? `${a.readingTimeMinutes} min` : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
