'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SiteSearch, MobileSearch } from '@/components/search/site-search';

const NAV = [
  { label: 'Sportsbooks', href: '/sportsbooks' },
  { label: 'Prediction Markets', href: '/prediction-markets' },
  { label: 'Racing', href: '/horse-racing' },
  { label: 'DFS', href: '/dfs' },
  { label: 'States', href: '/states' },
  { label: 'Sports', href: '/sports' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
          Betting<span className="text-action">Bonuses</span>
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
          <SiteSearch />
        </div>

        {/* Mobile: search overlay trigger + hamburger */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <MobileSearch />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            className="inline-flex size-9 items-center justify-center rounded-md border"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t px-4 py-4 sm:px-6 md:hidden">
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
