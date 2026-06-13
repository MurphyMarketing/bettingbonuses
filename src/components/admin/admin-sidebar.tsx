import Link from 'next/link';
import { signOut } from '@/auth';
import { AdminNav } from './admin-nav';

/**
 * Persistent admin left sidebar. Server component (so admin pages stay
 * server-rendered) — only the nav's active-state piece (AdminNav) is a client
 * component. Footer pins to the bottom; sign-out reuses the existing
 * signOut({ redirectTo: '/admin/login' }) server action.
 */
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[230px] shrink-0 flex-col border-r bg-card">
      {/* Wordmark — a second route home to /admin, on top of the Dashboard item. */}
      <div className="px-4 py-4">
        <Link href="/admin" className="text-lg font-bold tracking-tight whitespace-nowrap">
          Betting<span className="text-primary">Bonuses</span>{' '}
          <span className="align-middle text-[10px] font-semibold tracking-widest text-muted-foreground">ADMIN</span>
        </Link>
      </div>
      <div className="border-t" />

      <AdminNav />

      {/* Footer pinned to the bottom. */}
      <div className="mt-auto flex flex-col gap-0.5 border-t p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          View site ↗
        </a>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }); }}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
