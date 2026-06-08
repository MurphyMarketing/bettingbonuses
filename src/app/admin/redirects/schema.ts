import { z } from 'zod';

export const redirectSchema = z.object({
  fromPath: z
    .string()
    .trim()
    .min(1, 'From path is required')
    .refine((v) => v.startsWith('/'), 'From path must start with /'),
  toPath: z
    .string()
    .trim()
    .min(1, 'To path is required')
    .refine((v) => v.startsWith('/') || /^https?:\/\/.+/i.test(v), 'Must be a / path or a full http(s) URL'),
  statusCode: z.coerce.number().refine((n) => n === 301 || n === 302, 'Status code must be 301 or 302').default(301),
  isActive: z.boolean().default(true),
  notes: z.string().trim().transform((v) => (v === '' ? null : v)).nullable().optional(),
});

export type RedirectInput = z.infer<typeof redirectSchema>;
export type RedirectFormState = { errors?: Record<string, string[]>; message?: string };

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : '_form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function redirectFormToRaw(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  return {
    fromPath: str('fromPath'),
    toPath: str('toPath'),
    statusCode: str('statusCode') || '301',
    isActive: formData.get('isActive') != null,
    notes: str('notes'),
  };
}
