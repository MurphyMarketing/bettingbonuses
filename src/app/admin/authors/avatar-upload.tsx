'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { AvatarUploadState } from './actions';

export function AvatarUpload({
  action,
  avatarUrl,
}: {
  action: (prev: AvatarUploadState, formData: FormData) => Promise<AvatarUploadState>;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Label>Avatar</Label>
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/30">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- static avatar preview
            <img src={avatarUrl} alt="Avatar preview" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input type="file" name="avatar" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="text-sm" />
          <Button type="submit" variant="outline" disabled={pending}>{pending ? 'Uploading…' : 'Upload avatar'}</Button>
        </div>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-primary">Avatar updated.</p> : null}
      <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP · max 1MB.</p>
    </form>
  );
}
