'use client';

import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/ui/rich-text-editor';
import { formatRelativeTime } from '@/lib/datetime';

/**
 * Shared rich-content editor field: the Tiptap RichTextEditor + autosave + an
 * "unsaved draft" restore banner + inline image upload + [[brand]] autocomplete
 * (the last two come from RichTextEditor itself). The draft backend is pluggable
 * via `draft` (the save target), so the same field works for any entity/field:
 *  - 'server': autosave hits a server action and the draft is computed server-side
 *    (used by articles — DB draft_body, unchanged behavior).
 *  - 'local': autosave persists to localStorage under a per-field key (used by
 *    brands + page_content, which have no draft columns).
 * Omit `draft` to disable autosave/restore entirely.
 */
export type RichContentDraft =
  | {
      mode: 'server';
      initialDraft: { body: string; savedAt: Date } | null;
      // Return type is ignored (fire-and-forget); the server actions return a status object.
      autosave: (html: string) => void | Promise<unknown>;
      discard: () => void | Promise<unknown>;
    }
  | { mode: 'local'; storageKey: string };

const AUTOSAVE_MS = 30_000;

export function RichContentField({
  name,
  label,
  hint,
  errors,
  defaultValue,
  placeholder,
  onImageUpload,
  draft,
}: {
  name: string;
  label?: string;
  hint?: string;
  errors?: string[];
  defaultValue: string;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string | null>;
  draft?: RichContentDraft;
}) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const bodyRef = useRef(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const [banner, setBanner] = useState<{ body: string; savedAt: Date } | null>(
    draft?.mode === 'server' ? draft.initialDraft ?? null : null,
  );

  // local mode: read any saved draft on mount; offer to restore if it differs.
  useEffect(() => {
    if (draft?.mode !== 'local') return;
    try {
      const raw = window.localStorage.getItem(draft.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { body?: string; savedAt?: string };
      if (parsed.body && parsed.body !== defaultValue) {
        // Post-mount read of a persisted draft — must be set in an effect (not the
        // initializer) so it doesn't diverge from the SSR/hydration render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBanner({ body: parsed.body, savedAt: parsed.savedAt ? new Date(parsed.savedAt) : new Date() });
      }
    } catch {
      /* ignore malformed/unavailable storage */
    }
  }, [draft, defaultValue]);

  // Autosave the editor HTML every 30s.
  useEffect(() => {
    if (!draft) return;
    const t = setInterval(() => {
      const html = bodyRef.current;
      if (draft.mode === 'server') {
        void draft.autosave(html);
      } else if (html !== defaultValue) {
        try {
          window.localStorage.setItem(draft.storageKey, JSON.stringify({ body: html, savedAt: new Date().toISOString() }));
        } catch {
          /* ignore quota/availability */
        }
      }
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [draft, defaultValue]);

  // local mode: clear the saved draft once the surrounding form is submitted
  // (the value is being persisted, so the local draft is no longer "unsaved").
  useEffect(() => {
    if (draft?.mode !== 'local') return;
    const form = containerRef.current?.closest('form');
    if (!form) return;
    const onSubmit = () => {
      try {
        window.localStorage.removeItem(draft.storageKey);
      } catch {
        /* ignore */
      }
    };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [draft]);

  const restore = () => {
    if (!banner) return;
    editorRef.current?.setContent(banner.body);
    setBanner(null);
  };
  const discard = async () => {
    if (draft?.mode === 'server') {
      await draft.discard();
    } else if (draft?.mode === 'local') {
      try {
        window.localStorage.removeItem(draft.storageKey);
      } catch {
        /* ignore */
      }
    }
    setBanner(null);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      {label ? <Label>{label}</Label> : null}
      {banner ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span>Unsaved draft from {formatRelativeTime(banner.savedAt)}.</span>
          <button type="button" className="font-medium text-primary underline" onClick={restore}>Restore draft</button>
          <button type="button" className="text-muted-foreground underline" onClick={discard}>Discard draft</button>
        </div>
      ) : null}
      <RichTextEditor
        ref={editorRef}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(h) => {
          bodyRef.current = h;
        }}
        onImageUpload={onImageUpload}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {errors?.length ? <p className="text-sm text-destructive">{errors.join(' ')}</p> : null}
    </div>
  );
}
