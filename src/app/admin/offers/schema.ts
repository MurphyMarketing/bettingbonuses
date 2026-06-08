import { z } from 'zod';
import { bonusKindEnum, offerStatusEnum, userSegmentEnum } from '@/db/schema';

export const BONUS_KIND_VALUES = bonusKindEnum.enumValues;
export const USER_SEGMENT_VALUES = userSegmentEnum.enumValues;
export const OFFER_STATUS_VALUES = offerStatusEnum.enumValues;

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

// Dollar string -> integer cents (or null). Integer math only.
const moneyCents = () =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === '') return null;
      const cleaned = v.replace(/[$,\s]/g, '');
      if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
        ctx.addIssue({ code: 'custom', message: 'Enter a dollar amount like 200 or 200.50' });
        return z.NEVER;
      }
      const [whole, frac = ''] = cleaned.split('.');
      return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
    })
    .nullable();

const optionalJson = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === '') return null;
    try {
      return JSON.parse(v) as unknown;
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Must be valid JSON' });
      return z.NEVER;
    }
  })
  .nullable();

export const offerSchema = z.object({
  brandId: z.coerce.number().int().positive('Select a brand'),
  bonusKind: z.enum(BONUS_KIND_VALUES, { message: 'Choose a bonus type' }),
  userSegment: z.enum(USER_SEGMENT_VALUES).default('new'),
  eventId: z.coerce.number().int().positive().nullable().optional(),
  seriesId: z.coerce.number().int().positive().nullable().optional(),
  sportId: z.coerce.number().int().positive().nullable().optional(),
  code: z.string().trim().max(50).transform((v) => (v === '' ? null : v)).nullable().optional(),
  headline: z.string().trim().min(1, 'Headline is required').max(300),
  description: optionalText,
  bonusAmountCents: moneyCents(),
  bonusMaxCents: moneyCents(),
  qualifyingDepositCents: moneyCents(),
  qualifyingBetCents: moneyCents(),
  wageringRequirementMultiplier: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  termsUrl: optionalUrl,
  termsSummary: optionalText,
  affiliateUrl: optionalUrl,
  isExclusive: z.boolean().default(false),
  validFrom: z.coerce.date().nullable().optional(),
  validTo: z.coerce.date().nullable().optional(),
  verificationNotes: optionalText,
  priority: z.coerce.number().int().default(0),
  isFeatured: z.boolean().default(false),
  status: z.enum(OFFER_STATUS_VALUES).default('draft'),
  attributes: optionalJson,
});

export type OfferInput = z.infer<typeof offerSchema>;

export type OfferFormState = { errors?: Record<string, string[]>; message?: string };

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : '_form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Build the offerSchema input shape from FormData. Money/text/url fields keep
 *  '' (their schema maps '' -> null/cents); FK ids and dates become undefined
 *  when blank; checkboxes become booleans. regionIds are read separately. */
export function offerFormToRaw(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const blankToUndef = (k: string) => {
    const v = str(k);
    return v === '' ? undefined : v;
  };
  return {
    brandId: str('brandId'),
    bonusKind: str('bonusKind'),
    userSegment: blankToUndef('userSegment') ?? 'new',
    eventId: blankToUndef('eventId'),
    seriesId: blankToUndef('seriesId'),
    sportId: blankToUndef('sportId'),
    code: str('code'),
    headline: str('headline'),
    description: str('description'),
    bonusAmountCents: str('bonusAmountCents'),
    bonusMaxCents: str('bonusMaxCents'),
    qualifyingDepositCents: str('qualifyingDepositCents'),
    qualifyingBetCents: str('qualifyingBetCents'),
    wageringRequirementMultiplier: blankToUndef('wageringRequirementMultiplier'),
    termsUrl: str('termsUrl'),
    termsSummary: str('termsSummary'),
    affiliateUrl: str('affiliateUrl'),
    isExclusive: formData.get('isExclusive') != null,
    validFrom: blankToUndef('validFrom'),
    validTo: blankToUndef('validTo'),
    verificationNotes: str('verificationNotes'),
    priority: blankToUndef('priority') ?? '0',
    isFeatured: formData.get('isFeatured') != null,
    status: blankToUndef('status') ?? 'draft',
    attributes: str('attributes'),
  };
}

/** Parse the regions multi-select (checkbox group) into a list of region ids. */
export function readRegionIds(formData: FormData): number[] {
  return formData
    .getAll('regionIds')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}
