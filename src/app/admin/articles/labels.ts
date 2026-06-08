export const ARTICLE_CATEGORY_LABELS: Record<string, string> = {
  guide: 'Guide',
  news: 'News',
  comparison: 'Comparison',
};

export const ARTICLE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export const ARTICLE_STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'destructive',
};

export const articleCategoryLabel = (v: string) => ARTICLE_CATEGORY_LABELS[v] ?? v;
export const articleStatusLabel = (v: string) => ARTICLE_STATUS_LABELS[v] ?? v;
