/**
 * Display labels + badge styling for brand enums. Pure constants — imported by
 * both server components (list page) and the client form, so no DB imports here.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  sportsbook: 'Sportsbook',
  prediction_market: 'Prediction Market',
  racing: 'Racing',
  dfs: 'DFS',
};

export const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  active: 'Active',
  rebranded: 'Rebranded',
  sunset: 'Sunset',
};

// Badge variant per status (variants defined in components/ui/badge.tsx).
export const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  planned: 'secondary',
  rebranded: 'outline',
  sunset: 'destructive',
};

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

export function statusLabel(value: string): string {
  return STATUS_LABELS[value] ?? value;
}
