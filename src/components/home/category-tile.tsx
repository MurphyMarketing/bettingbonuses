import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/BrandLogo';

export type CategoryBrand = { name: string; slug: string; logoUrl: string | null; logoSquareUrl: string | null };

/** Homepage "browse by category" tile — brand count + a strip of up to 4 brand
 *  logos (+ "+N" overflow), linking to the category hub. */
export function CategoryTile({
  slug,
  label,
  brandCount,
  brands,
  remaining,
}: {
  slug: string;
  label: string;
  brandCount: number;
  brands: CategoryBrand[];
  remaining: number;
}) {
  return (
    <Link href={`/${slug}/`} className="group">
      <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="block font-semibold">{label}</span>
            <span className="block text-xs text-muted-foreground">
              {brandCount} brand{brandCount === 1 ? '' : 's'}
            </span>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        {brands.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {brands.map((b) => (
              <div key={b.slug} className="w-16 rounded-md border bg-card">
                <BrandLogo name={b.name} slug={b.slug} logoUrl={b.logoUrl} logoSquareUrl={b.logoSquareUrl} hideName />
              </div>
            ))}
            {remaining > 0 ? (
              <div className="flex aspect-[2/1] w-16 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
                +{remaining}
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </Link>
  );
}
