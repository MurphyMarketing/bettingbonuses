'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable';

export type AffiliateLinkRow = {
  id: number;
  slug: string;
  destinationUrl: string;
  isActive: boolean;
  clickCount: number;
  brandName: string | null;
  lastClickedLabel: string;
};

const columns: AdminColumn<AffiliateLinkRow>[] = [
  { key: 'brand', label: 'Brand', sortable: true, sortAccessor: (l) => l.brandName, cell: (l) => l.brandName ?? '—' },
  { key: 'slug', label: 'Slug', sortable: true, sortAccessor: (l) => l.slug, cell: (l) => <span className="font-mono text-sm font-medium">/go/{l.slug}</span> },
  { key: 'destination', label: 'Destination', cell: (l) => <span className="block max-w-xs truncate text-sm text-muted-foreground">{l.destinationUrl}</span> },
  { key: 'status', label: 'Status', sortable: true, sortAccessor: (l) => l.isActive, cell: (l) => <Badge variant={l.isActive ? 'default' : 'destructive'}>{l.isActive ? 'Active' : 'Inactive'}</Badge> },
  { key: 'clicks', label: 'Clicks', sortable: true, sortAccessor: (l) => l.clickCount, cell: (l) => l.clickCount, className: 'text-right tabular-nums' },
  { key: 'lastClicked', label: 'Last clicked', cell: (l) => <span className="text-sm text-muted-foreground">{l.lastClickedLabel}</span> },
];

export function AffiliateLinksTable({ rows }: { rows: AffiliateLinkRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['slug', 'destinationUrl']}
      rowHref={(l) => `/admin/affiliate-links/${l.id}/edit`}
      defaultSort={{ key: 'brand', direction: 'asc' }}
      searchPlaceholder="Search links…"
      emptyState="No links match."
    />
  );
}
