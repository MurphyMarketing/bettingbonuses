# STATUS.md — BettingBonuses.com

**The living file.** What's shipped, what's in flight, what's undecided. A new chat reads this after VISION and ARCHITECTURE to learn where the build actually is. Where this doc and the repo disagree, the repo wins — and this file gets corrected, not the repo. Last reconciled against the repo at commit `ece8d3b`.

> The **Shipped** log below is ground truth from `git log` (authored by Claude Code, not chat memory). The **Repo reconciliation** section records places where the working narrative was ahead of the repo as of `84dd0c4` — keep each item until it's resolved.

## Shipped (sprint log)

**Setup & schema**
- `b523725→84bd64a` — scaffold, deps, env, Drizzle + initial migration
- `51aebe7` — seed regions/sports/event series/companies/brands
- `06c6015` — Auth.js (credentials + JWT, route protection)

**Phase 1 — admin + public core**
- `40733da` Brands CRUD · `677025e` Offers CRUD + one-click verify
- `e55a310` public layout/nav · `4e1a5ef` brand page (ISR + schema.org) · `98de667` brand×region · `7d91228` homepage + category hubs + launch offers

**Phase 2 A–H — CMS / content / E-E-A-T**
- `7cad18b` RG disclaimer + logo upload + state grid · `24ca853` authors + articles CMS + extended brand page · `f720494` content-status dashboard · `f8f4f5c` /states index + per-state
- `646fe65+3f901e6` Sprint D: Supabase Storage logos, /go redirects, redirects table, robots+sitemap
- `018d76c` Sprint E: Tiptap editor, HTML articles, image upload, DnD arrays, autosave
- `6c3e4a2` Sprint F: per-state content · `13bf728` Sprint G+I: Postgres FTS + header search + `[[` autocomplete · `a690cde` Sprint H: author enrichment (+ correlated-count bug fix)

**Sprints I-alt / J / K / L / M**
- `6eb5688→cdc3737` I-alt: brand-page state-availability + plural headings + grid removal
- `0b7b5ee` J: AdminTable list polish + dashboard
- `f9c07f9→8ffcc12` K (CP1–6): sport/event schema, nested offer picker, public sport/event hubs + slug fallback chain, time-aware homepage, bulk offer create, 2026-27 seed
- `0f55d9f→99a0d22` L (CP1–4): collapse event model to one layer, 3-way offer picker, single event page, Sports nav + event-date seed
- `5878214` M: homepage polish · `d11a1b7` remove "new launch" treatment

**Recent fixes / SEO / design**
- `a8da37d` BrandLogo component · `1290ed9` category hubs at bare `/[category]/` + normalized redirects · `749c8e1` /sports index shows all 12 + noindex thin · `4bed4a5` admin sidebar · `de0741d` tint-only category tiles
- `884d344+1b5124c` revalidation fix + systemic `revalidatePublic()` sweep
- `40084da/0c9cfc5/7092e75/b28aa24/ea577dd` national-only featured offer + national/state separation + per-brand offers admin
- `90faf0b→2635ce5` meta-title/description overrides (CP1–3)
- `cdaeced+a6f5853` 6 bonus-type hubs + legal pages · `08d4cbd+a7f3db6` free_bet/free_play removal (non-destructive + destructive enum recreate)
- `8fb27cc` OfferCard redesign + design-token seed · `84dd0c4` token propagation pass (see reconciliation #3)

**Per-market state facts (Option B) — committed, unpushed**
- `72daf87` CP1 migration (`market_legal_status` enum + 8 per-market columns on regions; sportsbook backfill) · `aaf2cb8` CP2 admin per-market status/min-age grid · `92f55c5` CP3 public per-market table · `89953b8` add `retail_only` enum value (+ labels) · `ece8d3b` authoritative per-market import (51 states; 0 unmatched)
- `198a74a` category-hub brand-card logo + name link to brand page (**closes reconciliation #2**)
- `a737bbc` docs orientation layer (this `/docs`)

> **Unpushed stack (origin..HEAD), oldest→newest:** `84dd0c4` → `a737bbc` → `72daf87` → `aaf2cb8` → `92f55c5` → `198a74a` → `89953b8` → `ece8d3b` (+ this STATUS commit). Ships together after owner localhost review of the token-propagation visual change.

## In flight / not yet on origin
- **Sports per-sport prerender (Option A)** — approved, *not applied*. `/sports/[sport-slug]` still filters eventless sports out of `generateStaticParams` (they're SSR-on-demand). Reopens the pooler-`ENOTFOUND` 500 risk on thin sport pages. Likely the first sprint after the docs commit. (reconciliation #1)
- **Token propagation `84dd0c4`** — committed locally, *unpushed* (now the bottom of an 8-commit unpushed stack). Foundational-visual change, so it sits at the push-review gate by design. Staging/Vercel does not reflect it yet; any visual QA right now is on the pre-propagation tree. Decision needed: review on localhost, then push the whole stack. (reconciliation #3)
- **Per-market state facts (Option B)** — fully built + data imported, committed, *unpushed* (rides the same stack). Owner localhost review: admin per-market grid + public per-market table + a `retail_only`/"Not offered" state. ✓ category-hub clickable-card resolved (reconciliation #2).

## Open decisions
- **Rating system shape** — composite sub-scores → displayed overall + written rationale, vs. a single score + rationale. Leaning **composite**; chat recommends composite **+ `AggregateRating` schema** (fills the reserved `BrandRating` slot on the OfferCard). This is the VISION-stated moat, so treat it as core strategy, not polish.

## Repo reconciliation (narrative vs repo @ `84dd0c4`, from ARCHITECTURE §7)
Keep each item until resolved. The first three also appear under In flight above.
1. **Sports per-sport prerender not applied** — Option A queued, not live. Reliability/SEO. → In flight.
2. ~~**Clickable-card fix not applied** — only the button links today.~~ **RESOLVED** by `198a74a`: category-hub brand-card logo + name now link to the brand page via sibling links (logo `aria-hidden`+`tabIndex=-1` to avoid duplicate AT links). Deliberately not a whole-card stretched link (would nest anchors).
3. **`84dd0c4` unpushed** — local on main, 1 ahead of origin. → In flight, awaiting push-review.
4. **`/privacy` (static file) duplicates `/privacy-policy` (page_content)** — two privacy routes. Resolve via the cutover redirect map (`/privacy → /privacy-policy`). → Backlog #3.
5. **`output: 'standalone'` missing** — CLAUDE.md claims it; `next.config.ts` doesn't set it. Moot on Vercel, required before any Sevalla move. → Fix the CLAUDE.md line (done in this docs commit).
6. **Structured-data / sitemap gaps** — no JSON-LD on articles, category hubs, bonus hubs, or homepage; bonus-type hubs + sport/event pages are absent from the sitemap. Undercuts the VISION moat (rich snippets). → Backlog #5.

## Backlog (prioritized)
1. **Design-token gaps** — tokenized action-button variant + shared callout token.
2. **Rating system** — composite sub-scores → overall + written rationale + `Review`/`AggregateRating` schema (fills the reserved `BrandRating` slot). See open decision.
3. **Cutover redirect map** — old WP URLs → new (`/sports/→/sportsbooks/`, `/casino/→` drop, `/privacy→/privacy-policy`, `/fanduel/→/fanduel-sportsbook/`, …). Includes the reconciliation #4 privacy consolidation.
4. **DB-resilience pass** — harden `proxy.ts` `getActiveRedirects` + SSR fetches against pooler blips.
5. **Structured-data + sitemap sprint** — close reconciliation #6: JSON-LD on articles/hubs/homepage; add hubs + sport/event pages to the sitemap.
6. **Roadmap reconciliation** — full planned roadmap checked against the live WP site.
7. **Regulator URL verification** — the per-market import set regulator *names* for ~43 states but only **NJ + NY** have verified `regulator_url`s; the rest are blank. Needs a URL-verification pass to populate the remaining links (don't guess URLs — verify each).

## QA backlog (owner — auth-gated / visual; chat and Claude Code can't do these)
- Disclaimer per-surface check — **compliance gate**; nothing goes live until this passes.
- Admin sidebar click-through.
- Brand intro/body save → reload → render.
- No-redeploy logo test.
- General interaction QA.

## Watch items
- **Turbopack persistent-cache write failures** ("Unable to write SST file") after long sessions → kill node/next → `rm -rf .next` → single clean `dev`. Durable fix: disable Turbopack persistent disk cache for local dev.
- **Supabase pooler blips** (`ENOTFOUND …pooler.supabase.com`) transiently 500 SSR routes → prefer prerendering thin pages; broader resilience pass is Backlog #4.
