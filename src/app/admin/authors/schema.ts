import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), 'Must be a valid http(s) URL')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const authorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers, and hyphens only')
    .optional(),
  title: optionalText,
  credentials: optionalText,
  bio: optionalText,
  avatarUrl: optionalUrl,
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
});

export type AuthorInput = z.infer<typeof authorSchema>;
export type AuthorFormState = { errors?: Record<string, string[]>; message?: string };

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : '_form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function authorFormToRaw(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const blankToUndef = (k: string) => {
    const v = str(k);
    return v === '' ? undefined : v;
  };
  return {
    name: str('name'),
    slug: blankToUndef('slug'),
    title: str('title'),
    credentials: str('credentials'),
    bio: str('bio'),
    avatarUrl: str('avatarUrl'),
    isActive: formData.get('isActive') != null,
    displayOrder: blankToUndef('displayOrder') ?? '0',
  };
}
