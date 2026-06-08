import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { authors } from '@/db/schema';

export const metadata: Metadata = { title: 'Authors' };
export const revalidate = 3600;

export default async function AuthorsIndexPage() {
  const rows = await db
    .select({ slug: authors.slug, name: authors.name, title: authors.title, credentials: authors.credentials })
    .from(authors)
    .where(eq(authors.isActive, true))
    .orderBy(asc(authors.displayOrder), asc(authors.name));

  return (
    <div className="py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Our editorial team</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every offer on BettingBonuses.com is reviewed and verified by our team.
      </p>
      <ul className="mt-8 flex flex-col gap-6">
        {rows.map((a) => (
          <li key={a.slug}>
            <Link href={`/authors/${a.slug}/`} className="font-medium text-primary hover:underline">
              {a.name}
            </Link>
            {a.title ? <span className="block text-sm text-muted-foreground">{a.title}</span> : null}
            {a.credentials ? <span className="block text-sm text-muted-foreground">{a.credentials}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
