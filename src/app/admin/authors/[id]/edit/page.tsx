import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateAuthor, deactivateAuthor, uploadAuthorAvatar } from '../../actions';
import { AuthorForm, type AuthorFormValues } from '../../author-form';
import { AvatarUpload } from '../../avatar-upload';

export const metadata: Metadata = { title: 'Edit author', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditAuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [author] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
  if (!author) notFound();

  const values: AuthorFormValues = {
    name: author.name,
    slug: author.slug,
    title: author.title ?? '',
    credentials: author.credentials ?? '',
    bio: author.bio ?? '',
    fullBio: author.fullBio ?? '',
    linkedinUrl: author.linkedinUrl ?? '',
    twitterUrl: author.twitterUrl ?? '',
    websiteUrl: author.websiteUrl ?? '',
    email: author.email ?? '',
    expertiseAreas: (author.expertiseAreas ?? []).join('\n'),
    yearsExperience: author.yearsExperience != null ? String(author.yearsExperience) : '',
    isActive: author.isActive,
    displayOrder: String(author.displayOrder),
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link href="/admin/authors" className="text-sm text-muted-foreground hover:underline">← Authors</Link>
        <h1 className="mt-1 text-2xl font-semibold">{author.name}</h1>
        <p className="text-sm text-muted-foreground">/authors/{author.slug}</p>
      </div>

      <section className="mb-8 rounded-lg border p-4">
        <AvatarUpload action={uploadAuthorAvatar.bind(null, author.id)} avatarUrl={author.avatarUrl} />
      </section>

      <AuthorForm action={updateAuthor.bind(null, author.id)} values={values} submitLabel="Save changes" />

      {author.isActive ? (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">Deactivating hides the author; the record is kept.</p>
          <form action={deactivateAuthor.bind(null, author.id)}>
            <Button type="submit" variant="destructive">Deactivate author</Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
