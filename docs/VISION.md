# VISION.md — BettingBonuses.com
## What this is
BettingBonuses.com is a US sports-betting **affiliate** site, being rebuilt from a legacy WordPress site onto a custom Next.js platform. It earns by sending users to legal US sportsbooks, prediction markets, horse-racing (ADW) operators, and DFS apps via tracked affiliate links, and by being the most trustworthy, useful destination for finding current betting **bonuses, promotions, and promo codes**.
## Who it's for
US bettors looking for the best current sign-up offers and promo codes — by operator, by state, by sport/event, and by bonus type. Intent ranges from "FanDuel promo code" (branded) to "no deposit bonuses" (commercial) to "{state} betting promos" (local).
## The migration context
There is a **live WordPress site** (bettingbonuses.com) with ~359 referring domains but near-zero organic traffic after a 2025 collapse. We are replacing it with a custom build. The live site is therefore a **structural requirements doc** (what page types and content must exist), not a performance one (there are no current rankings to preserve). At cutover, existing URLs that carry link equity must be 301'd to their new equivalents.
## Strategic bets
1. **Content-heavy and full-featured.** This is not a thin offer directory. Every important page type supports rich editorial content, per-page SEO control, and structured data. Capability without polish is not the goal — the site must read as professional and high-end.
2. **Out-trust the operators in the SERPs.** Affiliates rarely beat operators on brand authority, so the edge is editorial: scored brand reviews with reasoning, verified/dated offers, genuine state-by-state and bonus-type depth, and structured data that earns rich snippets. "Here's our scored breakdown and why" is something an operator can't credibly do.
3. **Bonuses / promotions / promo codes are the core.** That framing drives the page types and the content. Offer freshness, accuracy, and required disclaimers are first-class, not afterthoughts.
4. **Evergreen structure that rolls forward.** Event pages (Super Bowl, Kentucky Derby) are single evergreen pages that roll forward each year, not per-year archives. URLs are durable; content updates in place.
## What we DO NOT do (hard scope boundaries)
- **No casino.** This is a sports-betting site. The legacy `/casino/` page is a redirect-or-drop at cutover, not a feature to rebuild.
- **No "free bet" or "free play" offers.** These promo types are legally prohibited in the relevant context and have been fully removed from the data model (enum, offers, UI). Do not reintroduce them.
- Not a betting operator, not a tipster/picks service — an affiliate/review platform.
## Compliance posture (non-negotiable)
- Every offer must display its operator-required disclaimer (RG hotlines, 21+, eligibility, excluded states, bonus terms) wherever the offer appears. Affiliate agreements require it.
- Responsible-gambling messaging and the legal pages (affiliate disclosure, privacy, responsible gambling, contact) are required at launch.
- **Hard hold:** no brand/offer content publishes to the live domain until per-offer disclaimers are shipped and verified on every offer surface.
## Editorial trust signals (the moat)
Scored brand ratings with written rationale + `Review`/`AggregateRating` structured data; "Verified {date}" on offers; genuine per-state and per-bonus-type content depth; E-E-A-T author bylines. These are what an affiliate can do that an operator won't.
