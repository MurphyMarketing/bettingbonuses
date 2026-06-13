# Design tokens — "The Betting Slip"

The shared **OfferCard** (`src/components/offer-card.tsx`) is the anchor of the
design system. This is the first component built on the token set below; the rest
of the site adopts it in a later **propagation pass** (out of scope for this
change — only the offer card and these tokens are styled so far).

## Where the tokens live

- **Source of truth:** `src/app/globals.css` — search `DESIGN-SYSTEM SEED`.
  Theme-aware colors are raw `--*` vars in `:root` / `.dark`, aliased into the
  Tailwind v4 `@theme` block so they generate utilities. Static scale tokens
  (type, radius, spacing) are declared directly in `@theme`.
- **Adoptable recipes:** `src/design/tokens.ts` exports `ds` — a small set of
  composed className strings (surface, CTA, badge, amount…) so other components
  reuse the same Tailwind strings via `cn()` instead of re-deriving them.

## The set

### Accent — one action color
The single accent: a vivid, confident azure, brighter/more chromatic than the
muted slate `--primary`, so a CTA reads unmistakably as **the** action while
staying in the site's blue family.

| Token | Utility | Light | Dark |
|---|---|---|---|
| `--color-action` | `bg-action` `text-action` `ring-action` `outline-action` | `oklch(0.58 0.18 256)` | `oklch(0.64 0.17 256)` |
| `--color-action-foreground` | `text-action-foreground` | `oklch(0.985 0 0)` | `oklch(0.18 0.03 256)` |
| `--color-action-hover` | `bg-action-hover` | `oklch(0.52 0.185 256)` | `oklch(0.70 0.165 256)` |

### Bonus-type badge tint
A styled, tinted, bordered badge — not a floating gray pill.

| Token | Utility | Light | Dark |
|---|---|---|---|
| `--color-bonus-tint` | `bg-bonus-tint` | `oklch(0.962 0.028 256)` | `oklch(0.30 0.05 256)` |
| `--color-bonus-tint-foreground` | `text-bonus-tint-foreground` | `oklch(0.43 0.13 256)` | `oklch(0.84 0.08 256)` |
| `--color-bonus-tint-border` | `border-bonus-tint-border` | `oklch(0.88 0.05 256)` | `oklch(0.42 0.06 256)` |

### Type scale
Font-size tokens carry paired line-height / tracking / weight.

| Utility | Size | Use |
|---|---|---|
| `text-eyebrow` | 11px / 0.09em / 600 / uppercase | micro-caps labels (badge, "Promo code") |
| `text-headline` | 17px / 600 | offer headline |
| `text-amount` | 32px / −0.02em / 700 | the dominant amount |
| `text-amount-lg` | 44px / −0.025em / 700 | featured amount |
| `font-display` | alias → sans stack | display face; **ready to repoint** at a distinctive font with zero component edits |

### Surface
| Utility | Value | Use |
|---|---|---|
| `rounded-card` | 16px (`--radius-card`) | the ticket corner |
| `p-card` / `gap-card` | 20px (`--spacing-card`) | card padding & internal rhythm |

## `ds` recipes (`src/design/tokens.ts`)

| Key | What it is |
|---|---|
| `ds.surface` | card shell: ring border, ticket radius, hover lift (`group/offer`) |
| `ds.topEdge` | accent gradient hairline across the card top |
| `ds.eyebrow` | micro-caps label |
| `ds.bonusBadge` | tinted/bordered bonus-type badge |
| `ds.amount` / `ds.amountLg` | dominant number (tabular-nums, display font) |
| `ds.cta` | filled accent CTA, focus ring, arrow nudge |
| `ds.pageTitle` | page H1 — display font, tight tracking, `sm:text-4xl` |
| `ds.sectionTitle` | section H2 — display font |
| `ds.lead` | intro/lead paragraph under a title (`text-lg` muted) |
| `ds.tile` | static surface for raw `<div>` tiles (ring + ticket radius) |
| `ds.tileHover` | interactive hover lift for clickable tiles — replaces ad-hoc `hover:bg-muted/50`; add to the shared `<Card>` (which already has bg/ring/radius) |

## Propagation pass — adopted areas

The vocabulary above is now applied beyond the offer card (presentational only):

- **Brand page** (`brand-view.tsx`, `BrandStateAvailability.tsx`): logo+name+rating
  hero, `pageTitle`/`sectionTitle` headings, the verdict as an accent call-out
  (`tile` + `border-l-action`), `action` accent throughout, `gap-card` grids.
- **Hubs** (`category-hub`, `bonus-hub`, `/sports`, `/states` indexes, per-sport
  and event hubs): `pageTitle` + `lead`, `gap-card` grids, brand/sport tiles on
  `tileHover`, `action` accent + prose links.
- **State pages** (`states/[region-slug]`, `[brand-slug]/[region-slug]`):
  headings, accent, `gap-card`, brand tiles on `tileHover`.
- **Homepage** (`page.tsx`): `pageTitle`/`lead`, `action` trust strip,
  `FeaturedOfferCard` rebuilt on the offer-card vocabulary (surface, hairline,
  bonus badge, `amountLg`, `cta`); `CategoryTile`/`EventCard` on `tileHover` +
  `action`.
- **Chrome** (`site-header`, `site-footer`): `font-display` wordmark with the
  `action` accent; footer group headings as `eyebrow` micro-caps.

### Flagged token gaps (deliberately NOT invented this pass)
- **Secondary / outline button**: hubs still use the shadcn `Button variant="outline"`
  (neutral border). No tokenized secondary-action style exists yet — left as-is.
- **Primary `<Button>` accent**: the shared `Button` `default` variant is still
  `bg-primary` (slate). It was left untouched to avoid restyling admin; the only
  filled primary action on the public site is the offer-card/featured `ds.cta`.
  A tokenized `action` button variant is the natural next addition.
- **Alert / callout surface**: the RG-resources and "offers vary by state" boxes
  use one-off `rounded-lg border bg-muted/30` / `bg-action/5`. A shared callout
  token would replace these.
- **Table style**: not encountered in these areas; still untokenized.

## Adoption notes for the propagation pass
- Swap a distinctive display face in one place: repoint `--font-display` in
  `globals.css` (load via `next/font` in the root layout).
- The rating slot is reserved: add `brands.rating` (+ thread it through
  `activeOfferCards` and the per-page card mappers) and `BrandRating` lights up
  with no card changes.
- Region-tier disclaimer: the resolver (`src/lib/disclaimer.ts`) already accepts
  a `regionDisclaimer`; pass one from the state / brand×state pages when that
  copy exists.
