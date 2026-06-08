import type { Metadata } from 'next';
import Link from 'next/link';
import { createRedirect } from '../actions';
import { RedirectForm, type RedirectFormValues } from '../redirect-form';

export const metadata: Metadata = { title: 'New redirect', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: RedirectFormValues = { fromPath: '', toPath: '', statusCode: '301', isActive: true, notes: '' };

export default function NewRedirectPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/redirects" className="text-sm text-muted-foreground hover:underline">← Redirects</Link>
        <h1 className="mt-1 text-2xl font-semibold">New redirect</h1>
      </div>
      <RedirectForm action={createRedirect} values={EMPTY} submitLabel="Create redirect" />
    </main>
  );
}
