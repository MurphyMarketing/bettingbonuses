import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { redirects } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateRedirect, deactivateRedirect } from '../../actions';
import { RedirectForm, type RedirectFormValues } from '../../redirect-form';

export const metadata: Metadata = { title: 'Edit redirect', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await db.select().from(redirects).where(eq(redirects.id, id)).limit(1);
  if (!r) notFound();

  const values: RedirectFormValues = {
    fromPath: r.fromPath,
    toPath: r.toPath,
    statusCode: String(r.statusCode),
    isActive: r.isActive,
    notes: r.notes ?? '',
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/redirects" className="text-sm text-muted-foreground hover:underline">← Redirects</Link>
        <h1 className="mt-1 font-mono text-xl font-semibold">{r.fromPath}</h1>
      </div>

      <RedirectForm action={updateRedirect.bind(null, r.id)} values={values} submitLabel="Save changes" />

      {r.isActive ? (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">Deactivating stops this redirect from firing. The record is kept.</p>
          <form action={deactivateRedirect.bind(null, r.id)}>
            <Button type="submit" variant="destructive">Deactivate redirect</Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
