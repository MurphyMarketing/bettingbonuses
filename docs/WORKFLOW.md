# WORKFLOW.md — How we work on BettingBonuses
## Roles
- **The owner (Michael)** runs the build locally, reviews, and makes all strategic/scope calls. Newer to terminal but capable. Located in Madison, WI.
- **Claude (chat)** plans, scopes, writes sprint specs and Claude Code prompts, reviews reports, holds the strategy/backlog, and maintains these docs. Cannot access the repo directly in most sessions — works through specs the owner runs.
- **Claude Code** (separate agentic tool, run locally by the owner) does the actual implementation, has full repo access, runs migrations against the shared DB, commits, and pushes.
## Source of truth
The **repo + git log + CLAUDE.md** are authoritative. These /docs are a durable orientation layer. Chat recaps are reconstruction — where anything conflicts, the repo wins. `ARCHITECTURE.md` and the STATUS "shipped" log are kept honest by Claude Code reading the actual repo, not by chat memory.
## The loop
1. Chat writes a scoped sprint spec or a single Claude Code prompt (in a copy-paste block).
2. Owner pastes it into Claude Code; it runs, commits, reports.
3. Owner pastes the report back to chat; chat reviews, endorses or corrects judgment calls, and gives the next step.
4. **One step at a time.** Multi-checkpoint sprints are common but run checkpoint-by-checkpoint with review between — *except* explicitly autonomous overnight runs (do all checkpoints, commit each, report once).
## Planning before sprinting
Plan first for anything of meaningful size: inventory the requirement (the live site is part of the spec), map page types and cross-cutting features, sequence, get sign-off — then build. Do **not** discover must-have features reactively by clicking around. (This doc system exists because that happened too much early on.)
## Push rules (standing default)
- **Auto-push when green** (tsc + eslint clean, build compiles) for additive/low-risk work: presentation, content, copy, isolated bugfixes, admin tooling.
- **Pause for review before pushing** when expensive to undo or high-stakes: schema migrations, data backfills/destructive changes, anything touching auth, redirects, payments, **compliance**, or a **foundational visual/design change** the owner wants to see rendered first.
- Migrations that are purely additive nullable columns may auto-push, but the report must flag that a migration ran.
## Pushing mechanics
- Preferred: **GitHub Desktop "Push origin"** button.
- Fallback (GitHub Desktop sometimes doesn't detect Claude Code's external commits): terminal `git push origin main`, then `git ls-remote origin main` to confirm the true remote SHA.
## Review discipline
- Read destructive-migration reports for actual (not expected) counts before pushing.
- Compliance features: verify the per-surface checklist before content goes live.
- Visual/design sprints: the owner reviews on localhost (chat cannot see rendered output); expect a round or two of iteration on anchor components.
- Claude Code cannot click through auth-gated admin UIs — those need owner QA.
## Recurring environment notes
- **Turbopack persistent-cache write failures** ("Unable to write SST file") recur after long sessions. Fix: kill node/next → `rm -rf .next` → single clean `dev`. Durable fix: disable Turbopack persistent disk cache for local dev.
- **Supabase pooler connectivity blips** (`ENOTFOUND …pooler.supabase.com`) can 500 non-prerendered (SSR) routes transiently. Prefer prerendering thin pages; a broader DB-resilience pass is deferred.
## Doc maintenance
At the end of a session that ships or decides anything, update `STATUS.md` (and `ARCHITECTURE.md` if architecture shifted). Keep STATUS current — it's the file a new chat relies on most. VISION and WORKFLOW change rarely.
