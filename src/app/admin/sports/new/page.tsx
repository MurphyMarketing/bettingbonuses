import type { Metadata } from 'next';
import Link from 'next/link';
import { createSport } from '../actions';
import { SportForm, type SportFormValues } from '../sport-form';

export const metadata: Metadata = { title: 'New sport', robots: { index: false, follow: false } };

const EMPTY: SportFormValues = { name: '', slug: '', category: '', displayOrder: '100', intro: '' };

export default function NewSportPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/sports" className="text-sm text-muted-foreground hover:underline">← Sports</Link>
        <h1 className="mt-1 text-2xl font-semibold">New sport</h1>
      </div>
      <SportForm action={createSport} values={EMPTY} submitLabel="Create sport" />
    </main>
  );
}
