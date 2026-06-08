import Link from 'next/link';

export type BylineAuthor = {
  slug: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  yearsExperience: number | null;
};

/** Byline shown at the bottom of brand and article pages (E-E-A-T). */
export function AuthorByline({
  authors,
  label = 'Reviewed by',
}: {
  authors: BylineAuthor[];
  label?: string;
}) {
  const list = authors.filter(Boolean);
  if (list.length === 0) return null;
  const currentYear = new Date().getFullYear();

  return (
    <section className="mt-12 border-t pt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-3 flex flex-wrap gap-6">
        {list.map((a) => {
          const years = a.yearsExperience ? Math.max(0, currentYear - a.yearsExperience) : null;
          return (
            <Link key={a.slug} href={`/authors/${a.slug}/`} className="group flex items-center gap-3">
              {a.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- static avatar
                <img src={a.avatarUrl} alt={a.name} className="size-12 rounded-full object-cover" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">
                  {a.name.charAt(0)}
                </span>
              )}
              <span>
                <span className="block font-medium group-hover:underline">{a.name}</span>
                {a.title ? <span className="block text-xs text-muted-foreground">{a.title}</span> : null}
                {years != null ? <span className="block text-xs text-muted-foreground">{years} years experience</span> : null}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
