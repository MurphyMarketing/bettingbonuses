import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { articles, authors } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateArticle, archiveArticle } from '../../actions';
import { ArticleForm, type ArticleFormValues } from '../../article-form';
import { ARTICLE_CATEGORY_VALUES, ARTICLE_STATUS_VALUES } from '../../schema';

export const metadata: Metadata = { title: 'Edit article', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!article) notFound();

  const authorRows = await db.select({ id: authors.id, name: authors.name }).from(authors).orderBy(asc(authors.name));

  const values: ArticleFormValues = {
    title: article.title,
    slug: article.slug,
    metaDescription: article.metaDescription ?? '',
    excerpt: article.excerpt ?? '',
    body: article.body ?? '',
    category: article.category,
    primaryAuthorId: article.primaryAuthorId ?? '',
    secondaryAuthorId: article.secondaryAuthorId ?? '',
    status: article.status,
  };

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/articles" className="text-sm text-muted-foreground hover:underline">← Articles</Link>
        <h1 className="mt-1 text-2xl font-semibold">{article.title}</h1>
        <p className="text-sm text-muted-foreground">
          /{article.slug}
          {article.readingTimeMinutes ? ` · ${article.readingTimeMinutes} min read` : ''}
        </p>
      </div>

      <ArticleForm
        action={updateArticle.bind(null, article.id)}
        authorsOptions={authorRows.map((a) => ({ value: a.id, label: a.name }))}
        categories={ARTICLE_CATEGORY_VALUES}
        statuses={ARTICLE_STATUS_VALUES}
        values={values}
        submitLabel="Save changes"
        articleId={article.id}
        initialDraft={
          article.draftBody && article.draftUpdatedAt && article.draftUpdatedAt.getTime() > article.updatedAt.getTime()
            ? { body: article.draftBody, savedAt: article.draftUpdatedAt }
            : null
        }
      />

      {article.status !== 'archived' ? (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">Archiving hides the article; the record is kept.</p>
          <form action={archiveArticle.bind(null, article.id)}>
            <Button type="submit" variant="destructive">Archive this article</Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
