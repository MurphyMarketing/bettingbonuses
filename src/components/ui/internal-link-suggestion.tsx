'use client';

import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from 'react';
import { Store, FileText, User } from 'lucide-react';
import type { SearchResult, SearchType } from '@/lib/search';

export type InternalLinkListHandle = { onKeyDown: (props: { event: KeyboardEvent }) => boolean };

const TYPE_ICON: Record<SearchType, ReactNode> = {
  brand: <Store className="size-4 text-muted-foreground" />,
  article: <FileText className="size-4 text-muted-foreground" />,
  author: <User className="size-4 text-muted-foreground" />,
};
const TYPE_LABEL: Record<SearchType, string> = { brand: 'Brands', article: 'Articles', author: 'Authors' };

export const InternalLinkList = forwardRef<InternalLinkListHandle, { items: SearchResult[]; command: (item: SearchResult) => void }>(
  function InternalLinkList({ items, command }, ref) {
    const [active, setActive] = useState(0);
    useEffect(() => setActive(0), [items]);

    const select = (i: number) => {
      const item = items[i];
      if (item) command(item);
    };

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }) => {
          if (items.length === 0) return false;
          if (event.key === 'ArrowDown') {
            setActive((a) => (a + 1) % items.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            setActive((a) => (a - 1 + items.length) % items.length);
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            select(active);
            return true;
          }
          return false; // Escape etc. handled by the suggestion plugin (leaves literal text)
        },
      }),
      [items, active],
    );

    if (items.length === 0) {
      return <div className="min-w-56 rounded-lg border bg-popover p-3 text-sm text-muted-foreground shadow-md">No matches</div>;
    }

    let lastType: SearchType | null = null;
    return (
      <div className="max-h-64 min-w-64 overflow-y-auto rounded-lg border bg-popover py-1 text-sm shadow-md">
        {items.map((item, i) => {
          const header = item.type !== lastType ? TYPE_LABEL[item.type] : null;
          lastType = item.type;
          return (
            <div key={`${item.type}-${item.id}`}>
              {header ? <p className="px-3 pb-0.5 pt-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{header}</p> : null}
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(i);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${i === active ? 'bg-muted' : ''}`}
              >
                {TYPE_ICON[item.type]}
                <span className="truncate">{item.title}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  },
);
