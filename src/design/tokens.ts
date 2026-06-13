/**
 * DESIGN-SYSTEM SEED — "The Betting Slip"
 * ========================================
 * The shared OfferCard is the anchor of the design system. The raw values live
 * as CSS custom properties / Tailwind v4 theme tokens in `src/app/globals.css`
 * (search "DESIGN-SYSTEM SEED"); this module documents them and exposes a few
 * reusable className recipes so other components can ADOPT the system in the
 * propagation pass without re-deriving the same Tailwind strings.
 *
 * Token reference (defined in globals.css @theme + :root/.dark):
 *
 *   COLOR (theme-aware, light/dark)
 *     --color-action / -foreground / -hover   vivid azure CTA + focus color
 *     --color-bonus-tint / -foreground / -border   styled bonus-type badge
 *       → utilities: bg-action, text-action, ring-action, bg-bonus-tint, …
 *
 *   TYPE SCALE (font-size + paired line-height/tracking/weight)
 *     text-eyebrow   11px micro-caps labels   (0.09em tracking, 600)
 *     text-headline  17px offer headline      (600)
 *     text-amount    32px dominant number     (-0.02em, 700)
 *     text-amount-lg 44px featured amount     (-0.025em, 700)
 *     font-display   display-font alias (currently the sans stack)
 *
 *   SURFACE
 *     rounded-card   16px ticket radius   (--radius-card)
 *     p-card/gap-card 20px rhythm unit    (--spacing-card)
 *
 * Usage: import { ds } from "@/design/tokens" and spread/compose with cn().
 */

export const ds = {
  /** Card surface: the "ticket" — ring border, ticket radius, hover lift. */
  surface:
    "group/offer relative overflow-hidden rounded-card bg-card text-card-foreground ring-1 ring-foreground/10 transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:ring-foreground/15 hover:shadow-[0_12px_30px_-12px_oklch(0.2_0.03_256/0.25)]",

  /** Accent hairline strip across the top of the card — the slip's identity. */
  topEdge:
    "absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-action to-action-hover",

  /** Micro-caps eyebrow / label. */
  eyebrow: "text-eyebrow uppercase text-muted-foreground",

  /** Styled bonus-type badge (tinted, bordered — not a floating gray pill). */
  bonusBadge:
    "inline-flex h-6 w-fit items-center rounded-md border border-bonus-tint-border bg-bonus-tint px-2 text-eyebrow uppercase text-bonus-tint-foreground",

  /** The dominant amount. */
  amount: "font-display text-amount tabular-nums text-foreground",
  amountLg: "font-display text-amount-lg tabular-nums text-foreground",

  /** Primary CTA: filled action color, confident, with an arrow that nudges. */
  cta:
    "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-action-foreground shadow-sm transition-[background-color,box-shadow,transform] hover:bg-action-hover hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action active:translate-y-px",

  // ---- Cross-component recipes (propagation pass) ----
  // The same vocabulary the offer card established, factored out so every page
  // shares ONE set of headings, surfaces and accents instead of re-deriving them.

  /** Page H1. Display font + tight tracking; scales up on desktop. */
  pageTitle: "font-display text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl",

  /** Section H2. */
  sectionTitle: "font-display text-xl font-semibold tracking-tight text-foreground",

  /** Intro / lead paragraph under a page title. */
  lead: "max-w-2xl text-lg leading-relaxed text-muted-foreground",

  /** Static card/tile surface — matches the offer card's ring + ticket radius
   *  (use on raw <div> tiles; for the shared <Card> primitive, which already
   *  carries bg/ring/rounded-xl, just add `tileHover`). */
  tile: "rounded-card bg-card text-card-foreground ring-1 ring-foreground/10",

  /** Interactive hover for clickable tiles — the same lift the offer card uses.
   *  Replaces ad-hoc `hover:bg-muted/50`. Pair with a `group/tile` parent if you
   *  want child hover effects. */
  tileHover:
    "transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_oklch(0.2_0.03_256/0.25)]",
} as const

export type DesignTokens = typeof ds
