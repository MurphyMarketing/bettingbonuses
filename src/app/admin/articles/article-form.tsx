'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichContentField } from '@/components/admin/rich-content-field';
import { uploadEditorImage } from '@/components/admin/editor-image';
import { slugify } from '@/lib/slug';
import { saveArticleDraft, discardArticleDraft } from './actions';
import { articleCategoryLabel, articleStatusLabel } from './labels';
import type { ArticleFormState } from './schema';

export type Option = { value: string; label: string };

export type ArticleFormValues = {
  title: string;
  slug: string;
  metaDescription: string;
  excerpt: string;
  body: string;
  category: string;
  primaryAuthorId: string;
  secondaryAuthorId: string;
  status: string;
};

function Field({ label, htmlFor, errors, children, hint }: { label: string; htmlFor?: string; errors?: string[]; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {errors?.length ? <p className="text-sm text-destructive">{errors.join(' ')}</p> : null}
    </div>
  );
}

export function ArticleForm({
  action,
  authorsOptions,
  categories,
  statuses,
  values,
  submitLabel,
  articleId,
  initialDraft,
}: {
  action: (prev: ArticleFormState, formData: FormData) => Promise<ArticleFormState>;
  authorsOptions: Option[];
  categories: readonly string[];
  statuses: readonly string[];
  values: ArticleFormValues;
  submitLabel: string;
  articleId?: string;
  initialDraft?: { body: string; savedAt: Date } | null;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errs = state.errors ?? {};
  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(values.slug));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {errs._form?.length ? <p role="alert" className="text-sm text-destructive">{errs._form.join(' ')}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" errors={errs.title}>
          <Input id="title" name="title" required value={title} onChange={(e) => { setTitle(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Slug" htmlFor="slug" errors={errs.slug} hint="Root-level URL: /[slug]. Must be globally unique (brands + articles).">
          <Input id="slug" name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} />
        </Field>

        <Field label="Category" errors={errs.category}>
          <Select name="category" defaultValue={values.category || 'guide'}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{articleCategoryLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status" errors={errs.status}>
          <Select name="status" defaultValue={values.status || 'draft'}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {statuses.map((s) => <SelectItem key={s} value={s}>{articleStatusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Primary author" errors={errs.primaryAuthorId}>
          <Select name="primaryAuthorId" defaultValue={values.primaryAuthorId || undefined}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select an author" /></SelectTrigger>
            <SelectContent>
              {authorsOptions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Secondary author (optional)" errors={errs.secondaryAuthorId}>
          <Select name="secondaryAuthorId" defaultValue={values.secondaryAuthorId || ''}>
            <SelectTrigger className="w-full"><SelectValue placeholder="— None —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— None —</SelectItem>
              {authorsOptions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Meta description" htmlFor="metaDescription" errors={errs.metaDescription}>
        <Textarea id="metaDescription" name="metaDescription" rows={2} defaultValue={values.metaDescription} />
      </Field>
      <Field label="Excerpt" htmlFor="excerpt" errors={errs.excerpt}>
        <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={values.excerpt} />
      </Field>

      <RichContentField
        name="body"
        label="Body"
        hint="Rich text — stored as HTML. Reading time is calculated from the word count on save."
        errors={errs.body}
        defaultValue={values.body}
        placeholder="Write the article…"
        onImageUpload={uploadEditorImage}
        draft={
          articleId
            ? {
                mode: 'server',
                initialDraft: initialDraft ?? null,
                autosave: (h) => saveArticleDraft(articleId, h),
                discard: () => discardArticleDraft(articleId),
              }
            : undefined
        }
      />

      <div>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
