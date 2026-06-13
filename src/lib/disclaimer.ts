/**
 * Responsible-gambling / terms disclaimer resolution.
 *
 * Legal requirement: terms must be presented WITH every offer. The shared
 * OfferCard now surfaces them through an affordance (the "Terms" popover) rather
 * than inline, but the *text* is resolved here with a stable three-tier fallback
 * so the offer is never shown without a disclaimer:
 *
 *   1. region   — a state-specific disclaimer, when the rendering context has one
 *   2. offer    — the per-offer `responsibleGamblingDisclaimer`
 *   3. site      — SITE_DEFAULT_DISCLAIMER (always present, last resort)
 *
 * Pure + dependency-free so it is safe in server and client components alike.
 */

/** Last-resort disclaimer shown when neither a region nor an offer supplies one.
 *  Placeholder legal copy — owner replaces with counsel-approved wording. */
export const SITE_DEFAULT_DISCLAIMER =
  '21+ and present in a state where the operator is licensed. Terms and conditions apply; see the operator’s site for full details. Gambling problem? Call 1-800-GAMBLER.';

/** Resolve the disclaimer for an offer in its rendering context (region → offer
 *  → site-default). Always returns a non-empty string. */
export function resolveDisclaimer(input: {
  regionDisclaimer?: string | null;
  offerDisclaimer?: string | null;
}): string {
  const region = input.regionDisclaimer?.trim();
  if (region) return region;
  const offer = input.offerDisclaimer?.trim();
  if (offer) return offer;
  return SITE_DEFAULT_DISCLAIMER;
}
