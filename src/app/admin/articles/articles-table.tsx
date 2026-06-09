'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';
import { articleCategoryLabel, articleStatusLabel, ARTICLE_STATUS_BADGE_VARIANT } from './labels';

const DAY = 86_400_000;

export type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  readingTimeMinutes: number | null;
  authorName: string | null;
  updatedAt: Date;
  updatedRelative: string;
};

const columns: AdminColumn<ArticleRow>[] = [
  {
    key: 'title',
    label: 'Title',
    sortable: true,
    sortAccessor: (a) => a.title,
    cell: (a) => (
      <>
        <span className="font-medium">{a.title}</span>
        <span className="block text-xs text-muted-foreground">/{a.slug}</span>
      </>
    ),
  },
  { key: 'category', label: 'Category', sortable: true, sortAccessor: (a) => articleCategoryLabel(a.category), cell: (a) => articleCategoryLabel(a.category) },
  { key: 'author', label: 'Author', sortable: true, sortAccessor: (a) => a.authorName, cell: (a) => a.authorName ?? '—' },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    sortAccessor: (a) => a.status,
    cell: (a) => <Badge variant={ARTICLE_STATUS_BADGE_VARIANT[a.status] ?? 'secondary'}>{articleStatusLabel(a.status)}</Badge>,
  },
  { key: 'updated', label: 'Updated', sortable: true, sortAccessor: (a) => a.updatedAt, cell: (a) => <span className="text-sm text-muted-foreground">{a.updatedRelative}</span> },
  { key: 'read', label: 'Read', sortable: true, sortAccessor: (a) => a.readingTimeMinutes, cell: (a) => (a.readingTimeMinutes ? `${a.readingTimeMinutes} min` : '—'), className: 'text-right tabular-nums text-muted-foreground' },
];

const statusFilters: AdminStatusFilter<ArticleRow>[] = [
  { key: 'published', label: 'Published', predicate: (a) => a.status === 'published' },
  { key: 'draft', label: 'Draft', predicate: (a) => a.status === 'draft' },
  { key: 'stale-draft', label: 'Draft 14d+', predicate: (a) => a.status === 'draft' && Date.now() - a.updatedAt.getTime() > 14 * DAY },
];

export function ArticlesTable({ rows }: { rows: ArticleRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['title', 'slug']}
      statusFilters={statusFilters}
      rowHref={(a) => `/admin/articles/${a.id}/edit`}
      defaultSort={{ key: 'updated', direction: 'desc' }}
      searchPlaceholder="Search articles…"
      emptyState="No articles match."
    />
  );
}
