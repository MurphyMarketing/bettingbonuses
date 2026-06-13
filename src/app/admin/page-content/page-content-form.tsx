'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { RichContentField } from '@/components/admin/rich-content-field';
import { uploadEditorImage } from '@/components/admin/editor-image';
import type { PageContentFormState } from './actions';

/** Edit form for one page_content row — the two shared rich editors (intro_body
 *  above, body below). Reuses RichContentField (CP2); no new editor code. */
export function PageContentForm({
  action,
  pageKey,
  introBody,
  body,
  submitLabel,
}: {
  action: (prev: PageContentFormState, fd: FormData) => Promise<PageContentFormState>;
  pageKey: string;
  introBody: string;
  body: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}

      <RichContentField
        name="introBody"
        label="Intro content (above)"
        hint="Rich content shown above the page's primary content. Leave empty to render nothing."
        defaultValue={introBody}
        placeholder="Intro content…"
        onImageUpload={uploadEditorImage}
        draft={{ mode: 'local', storageKey: `page:${pageKey}:introBody` }}
      />
      <RichContentField
        name="body"
        label="Body content (below)"
        hint="Rich content shown below the page's primary content. Leave empty to render nothing."
        defaultValue={body}
        placeholder="Body content…"
        onImageUpload={uploadEditorImage}
        draft={{ mode: 'local', storageKey: `page:${pageKey}:body` }}
      />

      <div>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
