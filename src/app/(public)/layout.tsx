import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/**
 * Public site chrome (header + footer). Applies to all public routes via the
 * (public) route group; /admin deliberately stays outside this layout so it
 * has no public header/footer.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
