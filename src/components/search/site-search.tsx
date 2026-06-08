'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Store, FileText, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchAction } from './actions';
import type { SearchResult, SearchResults, SearchType } from '@/lib/search';

const EMPTY: SearchResults = { brands: [], articles: [], authors: [] };

function useSearch(query: string, delay = 200) {
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await searchAction(q);
        if (id === seq.current) setResults(r);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [query, delay]);

  return { results, loading };
}

const flatten = (r: SearchResults): SearchResult[] => [...r.brands, ...r.articles, ...r.authors];

const TYPE_ICON: Record<SearchType, ReactNode> = {
  brand: <Store className="size-4 text-muted-foreground" />,
  article: <FileText className="size-4 text-muted-foreground" />,
  author: <User className="size-4 text-muted-foreground" />,
};

function Group({
  label,
  items,
  flat,
  active,
  onHover,
  onSelect,
}: {
  label: string;
  items: SearchResult[];
  flat: SearchResult[];
  active: number;
  onHover: (i: number) => void;
  onSelect: (item: SearchResult) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="py-1">
      <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {items.map((item) => {
        const idx = flat.indexOf(item);
        return (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.url}
            onMouseEnter={() => onHover(idx)}
            onClick={() => onSelect(item)}
            className={`flex items-start gap-2.5 px-3 py-2 text-sm ${idx === active ? 'bg-muted' : ''}`}
          >
            <span className="mt-0.5">{TYPE_ICON[item.type]}</span>
            <span className="min-w-0">
              <span className="block font-medium">{item.title}</span>
              {item.snippet ? <span className="block truncate text-xs text-muted-foreground">{item.snippet}</span> : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** The results panel + keyboard handling shared by desktop and mobile. */
function Results({
  query,
  results,
  loading,
  active,
  setActive,
  onSelect,
}: {
  query: string;
  results: SearchResults;
  loading: boolean;
  active: number;
  setActive: (i: number) => void;
  onSelect: (item: SearchResult) => void;
}) {
  const flat = flatten(results);
  if (query.trim().length < 2) return null;
  if (flat.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-muted-foreground">{loading ? 'Searching…' : 'No results.'}</p>;
  }
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <Group label="Brands" items={results.brands} flat={flat} active={active} onHover={setActive} onSelect={onSelect} />
      <Group label="Articles" items={results.articles} flat={flat} active={active} onHover={setActive} onSelect={onSelect} />
      <Group label="Authors" items={results.authors} flat={flat} active={active} onHover={setActive} onSelect={onSelect} />
    </div>
  );
}

function useKeyboard(flat: SearchResult[], onSelect: (item: SearchResult) => void, onClose: () => void) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [flat.length, flat[0]?.id]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      if (flat[active]) {
        e.preventDefault();
        onSelect(flat[active]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  return { active, setActive, onKeyDown };
}

/** Desktop: input with a dropdown panel. */
export function SiteSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading } = useSearch(query);
  const flat = flatten(results);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);
  const select = (item: SearchResult) => {
    router.push(item.url);
    setQuery('');
    setOpen(false);
  };
  const { active, setActive, onKeyDown } = useKeyboard(flat, select, close);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Search"
        placeholder="Search offers, brands, states…"
        className="pl-8"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && query.trim().length >= 2 ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          <Results query={query} results={results} loading={loading} active={active} setActive={setActive} onSelect={select} />
        </div>
      ) : null}
    </div>
  );
}

/** Mobile: a search button that opens a full-screen overlay. */
export function MobileSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch(query);
  const flat = flatten(results);

  const select = (item: SearchResult) => {
    router.push(item.url);
    setQuery('');
    setOpen(false);
  };
  const { active, setActive, onKeyDown } = useKeyboard(flat, select, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-md border"
      >
        <Search className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center gap-2 border-b p-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              aria-label="Search"
              placeholder="Search offers, brands, states…"
              className="flex-1 bg-transparent text-base outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="button" aria-label="Close search" onClick={() => setOpen(false)} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted">
              <X className="size-5" />
            </button>
          </div>
          <Results query={query} results={results} loading={loading} active={active} setActive={setActive} onSelect={select} />
        </div>
      ) : null}
    </>
  );
}
