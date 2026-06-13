'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Plain "Meta title" + "Meta description" inputs (NOT the rich editor — these are
 * meta tags). Empty = the page falls back to its template default. Reused by the
 * brand edit form and the page_content edit form. Includes a live character count.
 */
export function MetaFields({
  defaultTitle,
  defaultDescription,
  titleError,
  descError,
}: {
  defaultTitle: string;
  defaultDescription: string;
  titleError?: string[];
  descError?: string[];
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [desc, setDesc] = useState(defaultDescription);

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-sm font-medium">SEO / meta tags</h2>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="metaTitle">Meta title</Label>
        <Input id="metaTitle" name="metaTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          Overrides the page &lt;title&gt;. ~50–60 characters recommended. Leave empty to use the default.{' '}
          <span className={title.length > 60 ? 'font-medium text-destructive' : 'text-foreground'}>{title.length}</span> chars
        </p>
        {titleError?.length ? <p className="text-sm text-destructive">{titleError.join(' ')}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="metaDescription">Meta description</Label>
        <Textarea id="metaDescription" name="metaDescription" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          Overrides the meta description. ~150–160 characters recommended. Leave empty to use the default.{' '}
          <span className={desc.length > 160 ? 'font-medium text-destructive' : 'text-foreground'}>{desc.length}</span> chars
        </p>
        {descError?.length ? <p className="text-sm text-destructive">{descError.join(' ')}</p> : null}
      </div>
    </section>
  );
}
