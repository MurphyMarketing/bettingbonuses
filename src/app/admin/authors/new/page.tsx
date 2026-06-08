import type { Metadata } from 'next';
import Link from 'next/link';
import { createAuthor } from '../actions';
import { AuthorForm, type AuthorFormValues } from '../author-form';

export const metadata: Metadata = { title: 'New author', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: AuthorFormValues = {
  name: '', slug: '', title: '', credentials: '', bio: '', fullBio: '',
  linkedinUrl: '', twitterUrl: '', websiteUrl: '', email: '', expertiseAreas: '', yearsExperience: '',
  isActive: true, displayOrder: '0',
};

export default function NewAuthorPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/authors" className="text-sm text-muted-foreground hover:underline">← Authors</Link>
        <h1 className="mt-1 text-2xl font-semibold">New author</h1>
      </div>
      <AuthorForm action={createAuthor} values={EMPTY} submitLabel="Create author" />
    </main>
  );
}
