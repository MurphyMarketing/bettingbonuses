'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/ui/rich-text-editor';
import { slugify } from '@/lib/slug';
import { formatRelativeTime } from '@/lib/datetime';
import { uploadArticleImage, saveArticleDraft, discardArticleDraft } from './actions';
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

const AUTOSAVE_MS = 30_000;

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

  const editorRef = useRef<RichTextEditorHandle>(null);
  const bodyRef = useRef(values.body);
  const [draft, setDraft] = useState(initialDraft ?? null);

  // Autosave the editor HTML to draft_body every 30s (edit mode only — a brand
  // new article has no id yet to attach a draft to).
  useEffect(() => {
    if (!articleId) return;
    const t = setInterval(() => {
      void saveArticleDraft(articleId, bodyRef.current);
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [articleId]);

  const onImageUpload = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadArticleImage(fd);
    if (res.error) {
      window.alert(res.error);
      return null;
    }
    return res.url ?? null;
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {errs._form?.length ? <p role="alert" className="text-sm text-destructive">{errs._form.join(' ')}</p> : null}

      {draft && articleId ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span>Unsaved draft from {formatRelativeTime(draft.savedAt)}.</span>
          <button
            type="button"
            className="font-medium text-primary underline"
            onClick={() => {
              editorRef.current?.setContent(draft.body);
              setDraft(null);
            }}
          >
            Restore draft
          </button>
          <button
            type="button"
            className="text-muted-foreground underline"
            onClick={async () => {
              await discardArticleDraft(articleId);
              setDraft(null);
            }}
          >
            Discard draft
          </button>
        </div>
      ) : null}

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

      <Field label="Body" errors={errs.body} hint="Rich text — stored as HTML. Reading time is calculated from the word count on save.">
        <RichTextEditor
          ref={editorRef}
          name="body"
          defaultValue={values.body}
          onChange={(h) => { bodyRef.current = h; }}
          onImageUpload={onImageUpload}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
