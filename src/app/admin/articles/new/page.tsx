import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { createArticle } from '../actions';
import { ArticleForm, type ArticleFormValues } from '../article-form';
import { ARTICLE_CATEGORY_VALUES, ARTICLE_STATUS_VALUES } from '../schema';

export const metadata: Metadata = { title: 'New article', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: ArticleFormValues = {
  title: '', slug: '', metaDescription: '', excerpt: '', body: '', category: 'guide',
  primaryAuthorId: '', secondaryAuthorId: '', status: 'draft',
};

export default async function NewArticlePage() {
  const authorRows = await db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(asc(authors.name));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/articles" className="text-sm text-muted-foreground hover:underline">← Articles</Link>
        <h1 className="mt-1 text-2xl font-semibold">New article</h1>
      </div>
      <ArticleForm
        action={createArticle}
        authorsOptions={authorRows.map((a) => ({ value: a.id, label: a.name }))}
        categories={ARTICLE_CATEGORY_VALUES}
        statuses={ARTICLE_STATUS_VALUES}
        values={EMPTY}
        submitLabel="Create article"
      />
    </main>
  );
}
