'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { slugify } from '@/lib/slug';
import { SortableArrayField } from '@/components/ui/sortable-array-field';
import { RichContentField } from '@/components/admin/rich-content-field';
import { uploadEditorImage } from '@/components/admin/editor-image';
import { MetaFields } from '@/components/admin/meta-fields';
import { categoryLabel, statusLabel } from './labels';
import type { BrandFormState } from './schema';

// Split a stored newline-joined value into an array for SortableArrayField.
const toLines = (v: string): string[] => v.split('\n').map((s) => s.trim()).filter(Boolean);

export type Option = { value: string; label: string };

export type BrandFormValues = {
  name: string;
  slug: string;
  category: string;
  status: string;
  companyId: string;
  rebrandedFromId: string;
  countryCode: string;
  websiteUrl: string;
  appStoreUrl: string;
  playStoreUrl: string;
  affiliateProgram: string;
  defaultAffiliateLink: string;
  shortDescription: string;
  fullDescription: string;
  yearFounded: string;
  launchDate: string;
  sunsetDate: string;
  notes: string;
  // Rich HTML slots (render above/below the brand page primary content)
  introBody: string;
  body: string;
  // Per-page SEO overrides
  metaTitle: string;
  metaDescription: string;
  // Sprint B review content (arrays edited as one-item-per-line text)
  introParagraph: string;
  howToClaimSteps: string;
  pros: string;
  cons: string;
  verdict: string;
  otherPromotions: string;
  depositOptions: string;
  primaryAuthorId: string;
  secondaryAuthorId: string;
};

type BrandFormProps = {
  action: (prev: BrandFormState, formData: FormData) => Promise<BrandFormState>;
  companies: Option[];
  rebrandCandidates: Option[];
  authorsOptions: Option[];
  categories: readonly string[];
  statuses: readonly string[];
  values: BrandFormValues;
  submitLabel: string;
  // Present in edit mode — keys the rich editors' localStorage autosave drafts.
  brandId?: number;
};

function Field({
  label,
  htmlFor,
  errors,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  errors?: string[];
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {errors?.length ? (
        <p className="text-sm text-destructive">{errors.join(' ')}</p>
      ) : null}
    </div>
  );
}

export function BrandForm({
  action,
  companies,
  rebrandCandidates,
  authorsOptions,
  categories,
  statuses,
  values,
  submitLabel,
  brandId,
}: BrandFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const errs = state.errors ?? {};

  // Auto-generate slug from name until the user edits the slug field directly.
  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(values.slug));

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {errs._form?.length ? (
        <p role="alert" className="text-sm text-destructive">
          {errs._form.join(' ')}
        </p>
      ) : null}

      {/* Basics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" errors={errs.name}>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          errors={errs.slug}
          hint="Auto-generated from the name; override if needed (lowercase, hyphens)."
        >
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
          />
        </Field>

        <Field label="Category" errors={errs.category}>
          <Select name="category" defaultValue={values.category || undefined}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status" errors={errs.status}>
          <Select name="status" defaultValue={values.status || 'active'}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      {/* Relationships */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company" errors={errs.companyId}>
          <Select name="companyId" defaultValue={values.companyId || ''}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="— None —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— None —</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Rebranded from"
          errors={errs.rebrandedFromId}
          hint="The predecessor brand, if this one replaced an earlier brand."
        >
          <Select name="rebrandedFromId" defaultValue={values.rebrandedFromId || ''}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="— None —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— None —</SelectItem>
              {rebrandCandidates.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Country code" htmlFor="countryCode" errors={errs.countryCode}>
          <Input id="countryCode" name="countryCode" defaultValue={values.countryCode || 'US'} maxLength={2} />
        </Field>

        <Field label="Year founded" htmlFor="yearFounded" errors={errs.yearFounded}>
          <Input id="yearFounded" name="yearFounded" type="number" inputMode="numeric" defaultValue={values.yearFounded} />
        </Field>
      </section>

      {/* Links */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Website URL" htmlFor="websiteUrl" errors={errs.websiteUrl}>
          <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={values.websiteUrl} />
        </Field>
        <Field label="Default affiliate link" htmlFor="defaultAffiliateLink" errors={errs.defaultAffiliateLink}>
          <Input id="defaultAffiliateLink" name="defaultAffiliateLink" type="url" defaultValue={values.defaultAffiliateLink} />
        </Field>
        <Field label="App Store URL" htmlFor="appStoreUrl" errors={errs.appStoreUrl}>
          <Input id="appStoreUrl" name="appStoreUrl" type="url" defaultValue={values.appStoreUrl} />
        </Field>
        <Field label="Play Store URL" htmlFor="playStoreUrl" errors={errs.playStoreUrl}>
          <Input id="playStoreUrl" name="playStoreUrl" type="url" defaultValue={values.playStoreUrl} />
        </Field>
        <Field label="Affiliate program" htmlFor="affiliateProgram" errors={errs.affiliateProgram}>
          <Input id="affiliateProgram" name="affiliateProgram" defaultValue={values.affiliateProgram} />
        </Field>
      </section>

      {/* Lifecycle dates */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Launch date" htmlFor="launchDate" errors={errs.launchDate}>
          <Input id="launchDate" name="launchDate" type="date" defaultValue={values.launchDate} />
        </Field>
        <Field label="Sunset date" htmlFor="sunsetDate" errors={errs.sunsetDate}>
          <Input id="sunsetDate" name="sunsetDate" type="date" defaultValue={values.sunsetDate} />
        </Field>
      </section>

      {/* Editorial */}
      <section className="flex flex-col gap-4">
        <Field label="Short description" htmlFor="shortDescription" errors={errs.shortDescription}>
          <Textarea id="shortDescription" name="shortDescription" rows={2} defaultValue={values.shortDescription} />
        </Field>
        <Field label="Full description" htmlFor="fullDescription" errors={errs.fullDescription}>
          <Textarea id="fullDescription" name="fullDescription" rows={5} defaultValue={values.fullDescription} />
        </Field>
        <Field label="Intro paragraph" htmlFor="introParagraph" errors={errs.introParagraph} hint="200–300 word brand intro shown near the top of the brand page.">
          <Textarea id="introParagraph" name="introParagraph" rows={4} defaultValue={values.introParagraph} />
        </Field>
        <Field label="Internal notes" htmlFor="notes" errors={errs.notes}>
          <Textarea id="notes" name="notes" rows={2} defaultValue={values.notes} />
        </Field>
      </section>

      <MetaFields
        defaultTitle={values.metaTitle}
        defaultDescription={values.metaDescription}
        titleError={errs.metaTitle}
        descError={errs.metaDescription}
      />

      {/* Rich page content — renders above (intro) and below (body) the brand page */}
      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Rich page content</h2>
        <RichContentField
          name="introBody"
          label="Intro content (above)"
          hint="Rich content shown above the brand page's offers and primary content. Leave empty to render nothing."
          errors={errs.introBody}
          defaultValue={values.introBody}
          placeholder="Intro content…"
          onImageUpload={uploadEditorImage}
          draft={brandId ? { mode: 'local', storageKey: `brand:${brandId}:introBody` } : undefined}
        />
        <RichContentField
          name="body"
          label="Body content (below)"
          hint="Rich content shown below the brand page's primary content. Leave empty to render nothing."
          errors={errs.body}
          defaultValue={values.body}
          placeholder="Body content…"
          onImageUpload={uploadEditorImage}
          draft={brandId ? { mode: 'local', storageKey: `brand:${brandId}:body` } : undefined}
        />
      </section>

      {/* Review content (Sprint B) */}
      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Review content</h2>
        <SortableArrayField name="howToClaimSteps" label="How to claim — steps" hint="Drag to reorder." initial={toLines(values.howToClaimSteps)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SortableArrayField name="pros" label="Pros" hint="Drag to reorder." initial={toLines(values.pros)} />
          <SortableArrayField name="cons" label="Cons" hint="Drag to reorder." initial={toLines(values.cons)} />
        </div>
        <Field label="Verdict" htmlFor="verdict" errors={errs.verdict}>
          <Textarea id="verdict" name="verdict" rows={3} defaultValue={values.verdict} />
        </Field>
        <SortableArrayField name="otherPromotions" label="Other promotions" hint="Drag to reorder." initial={toLines(values.otherPromotions)} />
        <Field label="Deposit options" htmlFor="depositOptions" errors={errs.depositOptions} hint="Comma-separated, e.g. Visa, PayPal, ACH.">
          <Input id="depositOptions" name="depositOptions" defaultValue={values.depositOptions} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary author" errors={errs.primaryAuthorId}>
            <Select name="primaryAuthorId" defaultValue={values.primaryAuthorId || ''}>
              <SelectTrigger className="w-full"><SelectValue placeholder="— None —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {authorsOptions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Secondary author" errors={errs.secondaryAuthorId}>
            <Select name="secondaryAuthorId" defaultValue={values.secondaryAuthorId || ''}>
              <SelectTrigger className="w-full"><SelectValue placeholder="— None —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {authorsOptions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
