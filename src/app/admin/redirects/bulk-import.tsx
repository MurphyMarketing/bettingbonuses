'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { bulkImportRedirects, type BulkImportState } from './actions';

export function BulkImport() {
  const [state, formAction, pending] = useActionState<BulkImportState, FormData>(bulkImportRedirects, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="pairs"
        rows={6}
        placeholder={'/old-path\t/new-path\n/racing/tvg/\t/fanduel-racing/'}
        className="font-mono text-xs"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>{pending ? 'Importing…' : 'Import'}</Button>
        {state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
        {state.imported != null ? (
          <span className="text-sm text-muted-foreground">Imported {state.imported}, skipped {state.skipped}.</span>
        ) : null}
      </div>
    </form>
  );
}
