/**
 * Display labels + badge styling for offer enums. Pure constants (no DB import),
 * safe in both server and client components.
 */
export const BONUS_KIND_LABELS: Record<string, string> = {
  bonus_bets: 'Bonus bets',
  deposit_match: 'Deposit match',
  bet_insurance: 'Bet insurance',
  no_deposit_bonus: 'No-deposit bonus',
  odds_boost: 'Odds boost',
  parlay_boost: 'Parlay boost',
  cashback: 'Cashback',
  reload_bonus: 'Reload bonus',
  profit_boost: 'Profit boost',
  other: 'Other',
};

export const USER_SEGMENT_LABELS: Record<string, string> = {
  new: 'New users',
  existing: 'Existing users',
  all: 'All users',
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  expired: 'Expired',
  archived: 'Archived',
};

export const OFFER_STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  draft: 'secondary',
  paused: 'outline',
  expired: 'destructive',
  archived: 'destructive',
};

export const bonusKindLabel = (v: string) => BONUS_KIND_LABELS[v] ?? v;
export const userSegmentLabel = (v: string) => USER_SEGMENT_LABELS[v] ?? v;
export const offerStatusLabel = (v: string) => OFFER_STATUS_LABELS[v] ?? v;
