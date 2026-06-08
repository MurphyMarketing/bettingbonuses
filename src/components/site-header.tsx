'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const NAV = [
  { label: 'Sportsbooks', href: '/sportsbooks/promo-codes' },
  { label: 'Prediction Markets', href: '/prediction-markets/promo-codes' },
  { label: 'Racing', href: '/horse-racing/promo-codes' },
  { label: 'DFS', href: '/dfs/promo-codes' },
  { label: 'States', href: '/states' },
];

// Non-functional placeholder — the search UI affordance only (no backend yet).
function SearchBox({ id }: { id: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        aria-label="Search"
        placeholder="Search offers, brands, states…"
        className="pl-8"
      />
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight whitespace-nowrap">
          Betting<span className="text-primary">Bonuses</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden w-64 md:block">
          <SearchBox id="site-search-desktop" />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          className="ml-auto inline-flex size-9 items-center justify-center rounded-md border md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t px-4 py-4 sm:px-6 md:hidden">
          <div className="mb-4">
            <SearchBox id="site-search-mobile" />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
