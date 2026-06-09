'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type AdminColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  cell: (row: T) => ReactNode;
  sortAccessor?: (row: T) => string | number | boolean | Date | null | undefined;
  className?: string;
};

export type AdminStatusFilter<T> = {
  key: string;
  label: string;
  predicate: (row: T) => boolean;
};

export type AdminTableProps<T> = {
  rows: T[];
  columns: AdminColumn<T>[];
  searchFields: Array<keyof T | ((row: T) => string)>;
  statusFilters?: AdminStatusFilter<T>[];
  rowHref: (row: T) => string;
  defaultSort: { key: string; direction: 'asc' | 'desc' };
  searchPlaceholder?: string;
  emptyState?: ReactNode;
};

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls sort last
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1;
  return String(a).localeCompare(String(b));
}

export function AdminTable<T>({
  rows,
  columns,
  searchFields,
  statusFilters,
  rowHref,
  defaultSort,
  searchPlaceholder,
  emptyState,
}: AdminTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortKey = searchParams.get('sort') ?? defaultSort.key;
  const sortDir: 'asc' | 'desc' = searchParams.get('dir') === 'asc' ? 'asc' : searchParams.get('dir') === 'desc' ? 'desc' : defaultSort.direction;
  const filterKey = searchParams.get('filter') ?? '';
  const urlQ = searchParams.get('q') ?? '';

  const [q, setQ] = useState(urlQ);
  useEffect(() => setQ(urlQ), [urlQ]);

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === '') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce the search input -> URL (only on flush, so history/scroll stay sane).
  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => setParams({ q: q || null }), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onSort = (key: string) => {
    const dir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setParams({ sort: key, dir });
  };

  const visible = useMemo(() => {
    let out = rows;
    const needle = urlQ.trim().toLowerCase();
    if (needle) {
      out = out.filter((row) =>
        searchFields.some((f) => {
          const val = typeof f === 'function' ? f(row) : (row[f] as unknown);
          return String(val ?? '').toLowerCase().includes(needle);
        }),
      );
    }
    if (filterKey && statusFilters) {
      const sf = statusFilters.find((s) => s.key === filterKey);
      if (sf) out = out.filter(sf.predicate);
    }
    const col = columns.find((c) => c.key === sortKey);
    const accessor = col?.sortAccessor ?? ((row: T) => (row as Record<string, unknown>)[sortKey] as never);
    out = [...out].sort((a, b) => {
      const cmp = compare(accessor(a), accessor(b));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, urlQ, filterKey, sortKey, sortDir, columns, searchFields, statusFilters]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder ?? 'Search…'}
            className="w-64 pl-8"
            aria-label="Search"
          />
        </div>

        {statusFilters?.length ? (
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!filterKey} onClick={() => setParams({ filter: null })}>All</FilterChip>
            {statusFilters.map((sf) => (
              <FilterChip key={sf.key} active={filterKey === sf.key} onClick={() => setParams({ filter: filterKey === sf.key ? null : sf.key })}>
                {sf.label}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <span className="ml-auto text-sm text-muted-foreground">{visible.length} shown</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.sortable ? (
                    <button type="button" onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 hover:underline">
                      {c.label}
                      {sortKey === c.key ? (
                        sortDir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                      ) : null}
                    </button>
                  ) : (
                    c.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyState ?? 'No results.'}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => {
                const href = rowHref(row);
                return (
                  <TableRow key={href} className="hover:bg-muted/50">
                    {columns.map((c) => (
                      // Each cell is its own <Link> so the whole row is clickable AND
                      // middle-click / cmd-click open in a new tab.
                      <TableCell key={c.key} className={cn('p-0', c.className)}>
                        <Link href={href} className="block px-4 py-2.5">
                          {c.cell(row)}
                        </Link>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
