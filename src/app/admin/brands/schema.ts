import { z } from 'zod';
import { brandCategoryEnum, brandStatusEnum } from '@/db/schema';
import { SLUG_PATTERN } from '@/lib/slug';

export const CATEGORY_VALUES = brandCategoryEnum.enumValues;
export const STATUS_VALUES = brandStatusEnum.enumValues;

// Optional free text: '' -> null.
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

// Optional URL: '' -> null, otherwise must look like an http(s) URL.
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), 'Must be a valid http(s) URL')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

// Multi-line textarea -> string[] (one item per line), or null if empty.
const linesToArray = z
  .string()
  .transform((v) => v.split('\n').map((s) => s.trim()).filter(Boolean))
  .transform((arr) => (arr.length ? arr : null))
  .nullable();

export const brandSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  // Optional here; the action derives it from the name when omitted.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, 'Slug is too long')
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers, and hyphens only')
    .optional(),
  category: z.enum(CATEGORY_VALUES, { message: 'Choose a category' }),
  status: z.enum(STATUS_VALUES).default('active'),
  companyId: z.coerce.number().int().positive().nullable().optional(),
  rebrandedFromId: z.coerce.number().int().positive().nullable().optional(),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'Use a 2-letter country code')
    .default('US'),
  websiteUrl: optionalUrl,
  appStoreUrl: optionalUrl,
  playStoreUrl: optionalUrl,
  // logoUrl / logoSquareUrl are managed by the logo-upload action, not this form.
  affiliateProgram: optionalText,
  defaultAffiliateLink: optionalUrl,
  shortDescription: optionalText,
  introParagraph: optionalText,
  fullDescription: optionalText,
  // Rich HTML slots (Tiptap output) — render above/below the brand page content.
  introBody: optionalText,
  body: optionalText,
  yearFounded: z.coerce.number().int().min(1800).max(2100).nullable().optional(),
  launchDate: z.coerce.date().nullable().optional(),
  sunsetDate: z.coerce.date().nullable().optional(),
  notes: optionalText,
  // Structured review content (Sprint B)
  howToClaimSteps: linesToArray,
  pros: linesToArray,
  cons: linesToArray,
  verdict: optionalText,
  otherPromotions: linesToArray,
  depositOptions: optionalText, // comma-separated text
  primaryAuthorId: optionalText, // author uuid or null
  secondaryAuthorId: optionalText,
});

export type BrandInput = z.infer<typeof brandSchema>;

export type BrandFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

/** Collapse a ZodError into { field: [messages] } without depending on
 *  version-specific flatten APIs. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : '_form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Pull a brand's fields out of submitted FormData into the shape brandSchema
 *  expects. Numeric/date/slug fields become undefined when blank (so optional +
 *  coerce behave); text/URL fields keep '' (their schema maps '' -> null). */
export function brandFormToRaw(formData: FormData) {
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
    category: str('category'),
    status: blankToUndef('status') ?? 'active',
    companyId: blankToUndef('companyId'),
    rebrandedFromId: blankToUndef('rebrandedFromId'),
    countryCode: blankToUndef('countryCode') ?? 'US',
    websiteUrl: str('websiteUrl'),
    appStoreUrl: str('appStoreUrl'),
    playStoreUrl: str('playStoreUrl'),
    affiliateProgram: str('affiliateProgram'),
    defaultAffiliateLink: str('defaultAffiliateLink'),
    shortDescription: str('shortDescription'),
    introParagraph: str('introParagraph'),
    fullDescription: str('fullDescription'),
    introBody: str('introBody'),
    body: str('body'),
    yearFounded: blankToUndef('yearFounded'),
    launchDate: blankToUndef('launchDate'),
    sunsetDate: blankToUndef('sunsetDate'),
    notes: str('notes'),
    howToClaimSteps: str('howToClaimSteps'),
    pros: str('pros'),
    cons: str('cons'),
    verdict: str('verdict'),
    otherPromotions: str('otherPromotions'),
    depositOptions: str('depositOptions'),
    primaryAuthorId: str('primaryAuthorId'),
    secondaryAuthorId: str('secondaryAuthorId'),
  };
}
