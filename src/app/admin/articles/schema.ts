import { z } from 'zod';
import { articleCategoryEnum, articleStatusEnum } from '@/db/schema';

export const ARTICLE_CATEGORY_VALUES = articleCategoryEnum.enumValues;
export const ARTICLE_STATUS_VALUES = articleStatusEnum.enumValues;

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const articleSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only')
    .optional(),
  metaDescription: optionalText,
  excerpt: optionalText,
  body: optionalText,
  category: z.enum(ARTICLE_CATEGORY_VALUES).default('guide'),
  primaryAuthorId: z.string().trim().min(1, 'Select a primary author'),
  secondaryAuthorId: z.string().trim().transform((v) => (v === '' ? null : v)).nullable().optional(),
  status: z.enum(ARTICLE_STATUS_VALUES).default('draft'),
});

export type ArticleInput = z.infer<typeof articleSchema>;
export type ArticleFormState = { errors?: Record<string, string[]>; message?: string };

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : '_form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function articleFormToRaw(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const blankToUndef = (k: string) => {
    const v = str(k);
    return v === '' ? undefined : v;
  };
  return {
    title: str('title'),
    slug: blankToUndef('slug'),
    metaDescription: str('metaDescription'),
    excerpt: str('excerpt'),
    body: str('body'),
    category: blankToUndef('category') ?? 'guide',
    primaryAuthorId: str('primaryAuthorId'),
    secondaryAuthorId: str('secondaryAuthorId'),
    status: blankToUndef('status') ?? 'draft',
  };
}

/** ~200 words/minute, minimum 1 minute. null when there's no body. */
export function readingTimeMinutes(body: string | null): number | null {
  if (!body) return null;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 200));
}
