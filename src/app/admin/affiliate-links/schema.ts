import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';

const optionalText = z.string().trim().transform((v) => (v === '' ? null : v)).nullable().optional();

export const affiliateLinkSchema = z.object({
  slug: z.string().trim().toLowerCase().min(1, 'Slug is required').max(100).regex(SLUG_PATTERN, 'Use lowercase letters, numbers, and hyphens only'),
  brandId: z.coerce.number().int().positive('Select a brand'),
  offerId: z.coerce.number().int().positive().nullable().optional(),
  destinationUrl: z.string().trim().refine((v) => /^https?:\/\/.+/i.test(v), 'Must be a full http(s) URL'),
  label: optionalText,
  network: optionalText,
  isActive: z.boolean().default(true),
  validFrom: z.coerce.date().nullable().optional(),
  validTo: z.coerce.date().nullable().optional(),
});

export type AffiliateLinkInput = z.infer<typeof affiliateLinkSchema>;
export type AffiliateLinkFormState = { errors?: Record<string, string[]>; message?: string };

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : '_form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function affiliateLinkFormToRaw(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const blankToUndef = (k: string) => {
    const v = str(k);
    return v === '' ? undefined : v;
  };
  return {
    slug: str('slug'),
    brandId: str('brandId'),
    offerId: blankToUndef('offerId'),
    destinationUrl: str('destinationUrl'),
    label: str('label'),
    network: str('network'),
    isActive: formData.get('isActive') != null,
    validFrom: blankToUndef('validFrom'),
    validTo: blankToUndef('validTo'),
  };
}
