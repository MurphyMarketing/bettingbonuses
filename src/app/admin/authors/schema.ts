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

const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Must be a valid email')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

// Multi-line textarea -> string[] (one item per line), or null if empty.
const linesToArray = z
  .string()
  .transform((v) => v.split('\n').map((s) => s.trim()).filter(Boolean))
  .transform((arr) => (arr.length ? arr : null))
  .nullable();

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
  fullBio: optionalText, // HTML from RichTextEditor (sanitized on render)
  // avatarUrl is managed by the avatar-upload action, not this form.
  linkedinUrl: optionalUrl,
  twitterUrl: optionalUrl,
  websiteUrl: optionalUrl,
  email: optionalEmail,
  expertiseAreas: linesToArray,
  yearsExperience: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
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
    fullBio: str('fullBio'),
    linkedinUrl: str('linkedinUrl'),
    twitterUrl: str('twitterUrl'),
    websiteUrl: str('websiteUrl'),
    email: str('email'),
    expertiseAreas: str('expertiseAreas'),
    yearsExperience: blankToUndef('yearsExperience'),
    isActive: formData.get('isActive') != null,
    displayOrder: blankToUndef('displayOrder') ?? '0',
  };
}
