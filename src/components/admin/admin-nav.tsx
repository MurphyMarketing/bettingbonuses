'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Admin sidebar nav. Labels and routes diverge in two places ("States" ->
 * /admin/states, "Leagues & sports" -> /admin/sports), so the list is a config
 * of {label, href, matchPrefix} — explicit and trivial to reorder. All hrefs
 * verified against the real folders under src/app/admin/.
 */
type NavItem = { label: string; href: string; matchPrefix: string };

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', matchPrefix: '/admin' },
  { label: 'Brands', href: '/admin/brands', matchPrefix: '/admin/brands' },
  { label: 'Offers', href: '/admin/offers', matchPrefix: '/admin/offers' },
  { label: 'Events', href: '/admin/events', matchPrefix: '/admin/events' },
  { label: 'Articles', href: '/admin/articles', matchPrefix: '/admin/articles' },
  { label: 'Authors', href: '/admin/authors', matchPrefix: '/admin/authors' },
  { label: 'States', href: '/admin/states', matchPrefix: '/admin/states' },
  { label: 'Leagues & sports', href: '/admin/sports', matchPrefix: '/admin/sports' },
  { label: 'Redirects', href: '/admin/redirects', matchPrefix: '/admin/redirects' },
];

// Dashboard (/admin) highlights only on the exact path; every other item matches
// its segment prefix so child/edit/new routes keep the parent highlighted.
function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/admin') return pathname === '/admin';
  return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'relative rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
          : 'rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      }
    >
      {item.label}
    </Link>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const [dashboard, ...rest] = NAV;
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-3">
      <NavLink item={dashboard} pathname={pathname} />
      {/* Divider sets the Dashboard home anchor apart from the section list. */}
      <div className="my-2 border-t" />
      {rest.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}
