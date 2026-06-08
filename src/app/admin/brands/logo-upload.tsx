'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { LogoUploadState } from './actions';

const ACCEPT = '.svg,.png,.webp,image/svg+xml,image/png,image/webp';

function Slot({
  label,
  name,
  current,
  square,
}: {
  label: string;
  name: string;
  current: string | null;
  square?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div
        className={`flex items-center justify-center rounded-md border bg-muted/30 p-2 ${
          square ? 'size-20' : 'h-16 w-40'
        }`}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview, SVG/static
          <img src={current} alt={`${label} preview`} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">No logo</span>
        )}
      </div>
      <input id={name} type="file" name={name} accept={ACCEPT} className="text-sm" />
    </div>
  );
}

export function LogoUpload({
  action,
  logoUrl,
  logoSquareUrl,
}: {
  action: (prev: LogoUploadState, formData: FormData) => Promise<LogoUploadState>;
  logoUrl: string | null;
  logoSquareUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-8">
        <Slot label="Horizontal logo" name="logo" current={logoUrl} />
        <Slot label="Square logo" name="logoSquare" current={logoSquareUrl} square />
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-primary">Logo updated.</p> : null}

      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? 'Uploading…' : 'Upload logo'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">SVG, PNG, or WebP · max 500KB each.</p>
    </form>
  );
}
