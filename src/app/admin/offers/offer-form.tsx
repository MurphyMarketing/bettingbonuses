'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bonusKindLabel, userSegmentLabel, offerStatusLabel } from './labels';
import { OfferTargetPicker, type PickerSeries } from './offer-target-picker';
import type { OfferFormState } from './schema';

export type Option = { value: string; label: string };

export type OfferFormValues = {
  brandId: string;
  bonusKind: string;
  userSegment: string;
  seriesId: string;
  sportId: string;
  code: string;
  headline: string;
  description: string;
  bonusAmountCents: string;
  bonusMaxCents: string;
  qualifyingDepositCents: string;
  qualifyingBetCents: string;
  wageringRequirementMultiplier: string;
  termsUrl: string;
  termsSummary: string;
  responsibleGamblingDisclaimer: string;
  affiliateUrl: string;
  isExclusive: boolean;
  validFrom: string;
  validTo: string;
  verificationNotes: string;
  priority: string;
  isFeatured: boolean;
  status: string;
  attributes: string;
};

type OfferFormProps = {
  action: (prev: OfferFormState, formData: FormData) => Promise<OfferFormState>;
  brands: Option[];
  series: PickerSeries[];
  sports: Option[];
  regions: Option[];
  selectedRegionIds: string[];
  bonusKinds: readonly string[];
  userSegments: readonly string[];
  statuses: readonly string[];
  values: OfferFormValues;
  /** When set (the offer was created from a brand page), the create action
   *  redirects back to that brand's edit page instead of /admin/offers. */
  returnToBrandId?: string;
  submitLabel: string;
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
      {errors?.length ? <p className="text-sm text-destructive">{errors.join(' ')}</p> : null}
    </div>
  );
}

export function OfferForm({
  action,
  brands,
  series,
  sports,
  regions,
  selectedRegionIds,
  bonusKinds,
  userSegments,
  statuses,
  values,
  returnToBrandId,
  submitLabel,
}: OfferFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const errs = state.errors ?? {};
  // Track region selection so the Featured toggle can be gated on it: a
  // region-restricted offer can never be the national brand-page hero.
  const [regionIds, setRegionIds] = useState<Set<string>>(new Set(selectedRegionIds));
  const [isFeatured, setIsFeatured] = useState(values.isFeatured);
  const isRegionRestricted = regionIds.size > 0;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {returnToBrandId ? <input type="hidden" name="returnToBrandId" value={returnToBrandId} /> : null}
      {errs._form?.length ? (
        <p role="alert" className="text-sm text-destructive">
          {errs._form.join(' ')}
        </p>
      ) : null}

      {/* Core */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Brand" errors={errs.brandId}>
          <Select name="brandId" defaultValue={values.brandId || undefined}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Bonus type" errors={errs.bonusKind}>
          <Select name="bonusKind" defaultValue={values.bonusKind || undefined}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a bonus type" />
            </SelectTrigger>
            <SelectContent>
              {bonusKinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {bonusKindLabel(k)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Headline" htmlFor="headline" errors={errs.headline}>
          <Input id="headline" name="headline" required defaultValue={values.headline} />
        </Field>

        <Field label="Promo code" htmlFor="code" errors={errs.code}>
          <Input id="code" name="code" defaultValue={values.code} />
        </Field>

        <Field label="User segment" errors={errs.userSegment}>
          <Select name="userSegment" defaultValue={values.userSegment || 'new'}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a segment" />
            </SelectTrigger>
            <SelectContent>
              {userSegments.map((s) => (
                <SelectItem key={s} value={s}>
                  {userSegmentLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status" errors={errs.status}>
          <Select name="status" defaultValue={values.status || 'draft'}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {offerStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <Field label="Description" htmlFor="description" errors={errs.description}>
        <Textarea id="description" name="description" rows={3} defaultValue={values.description} />
      </Field>

      {/* Attachment — brand-wide / league-sport / event picker (mutually exclusive) */}
      <OfferTargetPicker
        sports={sports}
        series={series}
        defaultSportId={values.sportId}
        defaultSeriesId={values.seriesId}
        errors={errs.seriesId ?? errs.sportId ?? errs._target}
      />

      {/* Money (entered in dollars; stored as integer cents) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Bonus amount ($)" htmlFor="bonusAmountCents" errors={errs.bonusAmountCents}>
          <Input id="bonusAmountCents" name="bonusAmountCents" inputMode="decimal" placeholder="200.00" defaultValue={values.bonusAmountCents} />
        </Field>
        <Field label="Bonus max ($)" htmlFor="bonusMaxCents" errors={errs.bonusMaxCents} hint="Cap for percentage/deposit-match offers.">
          <Input id="bonusMaxCents" name="bonusMaxCents" inputMode="decimal" placeholder="1000.00" defaultValue={values.bonusMaxCents} />
        </Field>
        <Field label="Qualifying deposit ($)" htmlFor="qualifyingDepositCents" errors={errs.qualifyingDepositCents}>
          <Input id="qualifyingDepositCents" name="qualifyingDepositCents" inputMode="decimal" defaultValue={values.qualifyingDepositCents} />
        </Field>
        <Field label="Qualifying bet ($)" htmlFor="qualifyingBetCents" errors={errs.qualifyingBetCents}>
          <Input id="qualifyingBetCents" name="qualifyingBetCents" inputMode="decimal" defaultValue={values.qualifyingBetCents} />
        </Field>
        <Field label="Wagering requirement (x)" htmlFor="wageringRequirementMultiplier" errors={errs.wageringRequirementMultiplier}>
          <Input id="wageringRequirementMultiplier" name="wageringRequirementMultiplier" type="number" inputMode="numeric" defaultValue={values.wageringRequirementMultiplier} />
        </Field>
        <Field label="Priority" htmlFor="priority" errors={errs.priority} hint="Higher sorts first.">
          <Input id="priority" name="priority" type="number" inputMode="numeric" defaultValue={values.priority} />
        </Field>
      </section>

      {/* Terms & links */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Terms URL" htmlFor="termsUrl" errors={errs.termsUrl}>
          <Input id="termsUrl" name="termsUrl" type="url" defaultValue={values.termsUrl} />
        </Field>
        <Field label="Affiliate URL" htmlFor="affiliateUrl" errors={errs.affiliateUrl}>
          <Input id="affiliateUrl" name="affiliateUrl" type="url" defaultValue={values.affiliateUrl} />
        </Field>
      </section>
      <Field label="Terms summary" htmlFor="termsSummary" errors={errs.termsSummary}>
        <Textarea id="termsSummary" name="termsSummary" rows={2} defaultValue={values.termsSummary} />
      </Field>
      <Field
        label="Responsible gambling disclaimer"
        htmlFor="responsibleGamblingDisclaimer"
        errors={errs.responsibleGamblingDisclaimer}
        hint="Operator's exact RG copy; rendered verbatim under the offer."
      >
        <Textarea
          id="responsibleGamblingDisclaimer"
          name="responsibleGamblingDisclaimer"
          rows={2}
          defaultValue={values.responsibleGamblingDisclaimer}
        />
      </Field>

      {/* Validity */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Valid from" htmlFor="validFrom" errors={errs.validFrom}>
          <Input id="validFrom" name="validFrom" type="datetime-local" defaultValue={values.validFrom} />
        </Field>
        <Field label="Valid to" htmlFor="validTo" errors={errs.validTo} hint="Leave blank for evergreen (or to inherit an event end).">
          <Input id="validTo" name="validTo" type="datetime-local" defaultValue={values.validTo} />
        </Field>
      </section>

      {/* Flags */}
      <section className="flex flex-wrap gap-x-8 gap-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isExclusive" defaultChecked={values.isExclusive} className="size-4" />
          Exclusive offer
        </label>
        <div>
          <label className={`flex items-center gap-2 text-sm ${isRegionRestricted ? 'text-muted-foreground' : ''}`}>
            <input
              type="checkbox"
              name="isFeatured"
              checked={isFeatured && !isRegionRestricted}
              disabled={isRegionRestricted}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="size-4"
            />
            Featured
          </label>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {isRegionRestricted
              ? 'Featured applies to nationally-available offers. Uncheck all regions to feature this offer.'
              : 'Shown as the headline offer on the brand page. One per brand.'}
          </p>
        </div>
      </section>

      {/* Regions multi-select */}
      <Field label="Regions (optional)" errors={errs.regionIds} hint="Leave all unchecked to apply wherever the brand operates.">
        <div className="grid max-h-56 grid-cols-2 gap-x-6 gap-y-1.5 overflow-y-auto rounded-lg border p-3 sm:grid-cols-3">
          {regions.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="regionIds"
                value={r.value}
                checked={regionIds.has(r.value)}
                onChange={(e) =>
                  setRegionIds((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(r.value);
                    else next.delete(r.value);
                    return next;
                  })
                }
                className="size-4"
              />
              {r.label}
            </label>
          ))}
        </div>
      </Field>

      {/* Advanced */}
      <Field
        label="Attributes (JSON, optional)"
        htmlFor="attributes"
        errors={errs.attributes}
        hint='Free-form extras, e.g. {"min_odds": "-200"}.'
      >
        <Textarea id="attributes" name="attributes" rows={2} defaultValue={values.attributes} className="font-mono text-xs" />
      </Field>

      <Field label="Verification notes" htmlFor="verificationNotes" errors={errs.verificationNotes}>
        <Textarea id="verificationNotes" name="verificationNotes" rows={2} defaultValue={values.verificationNotes} />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
