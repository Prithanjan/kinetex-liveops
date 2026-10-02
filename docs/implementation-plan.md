# Kinetex LiveOps — Implementation Plan

> **For agentic workers:** This is a phased build plan. Work one phase at a time.
> Use TDD for engine changes (`bun test`), manual verification for Notion and UI.
> Keep `docs/memory/decision-log.md` updated in the same change that makes a decision.

**Goal:** Take the verified tracer bullet (one venue-change path, offline seed) to a real Notion-integrated, multi-change-type product with a post-event report, in phases that each end in working, verifiable software.

**Architecture:** Next.js 15 App Router over a pure deterministic impact engine and a swappable `EventSource`. Rules decide impact; the summary only explains it and stays labeled and source-linked.

**Tech stack:** Next.js 15 · React 19 · TypeScript strict · Tailwind v4 · bun · `@notionhq/client`.

**Spec:** [docs/specs/0001-venue-change-impact-engine.md](specs/0001-venue-change-impact-engine.md)
**Scope:** [docs/scope/scope.md](scope/scope.md)
**Flow:** [docs/user-flow.md](user-flow.md) · **Demo:** [docs/demo-script.md](demo-script.md)

---

## Global constraints (apply to every task)

- Node 24 · bun 1.3+ · `bun run typecheck`, `bun test`, and `bun run build` must pass before any commit.
- The engine is pure and deterministic. It must never import `fs`, `@notionhq/client`, or `fetch`.
- Generated output keeps the `GeneratedSummary` contract: `generated: true`, named `generator`, non-empty `sourceRecordIds`.
- Every number is measured or labeled a placeholder. No third category.
- Nothing is written before a human approval that names the approving role.
- Runtime state stays out of git (`data/runtime/`, `.env.local`).

## Current baseline (2026-10-02, commit `bde2178`)

Built and verified: typed event graph, local source, Notion adapter interface
(placeholder), impact engine (traversal + 6 rules + follow-ups + summary),
approval write-back, 4 API routes, 3 screens, 8 passing tests, full docs.
Not built: real Notion mapping, post-event report, extra change types,
reassignment, webhooks, auth, CI, deploy.

## How to use this plan

1. Read Phase 0. It is the only work blocked on the owner.
2. Do Phase 1 and Phase 2 in either order; Phase 1 needs Notion access, Phase 2 does not.
3. Phases 3–5 are breadth. Do not start them before Phase 1 or 2 is done.
4. Phase 6 is the delivery gate. Nothing ships without it.

| Phase | Theme | Blocked on owner? | Order |
|---|---|---|---|
| 0 | Notion workspace + prerequisites | **Yes** | First, or parallel |
| 1 | Real Notion source (read + write) | Yes | After 0 |
| 2 | Post-event report + lesson compiler | No | Any time |
| 3 | More change types | No | After 1 or 2 |
| 4 | Volunteer reassignment | No | After 3 |
| 5 | Webhooks, deploy, CI, hardening | Partly | After 1 |
| 6 | Demo, rehearsal, release | No | Last |

---

## Phase 0 — Owner prerequisites (only you can do)

**Objective:** Produce a real Notion workspace that matches the schema and an
`.env.local` with working credentials, so Phase 1 is mechanical.

**Why this is first:** It is the only thing an agent cannot do for you, and it
gates the highest-value phase.

### P0.1 — Decide the cutoff

- Pick the date you want the demo to be ready. Write it in `docs/memory/decision-log.md`.

### P0.2 — Create the Notion databases

- Create one parent page named `Kinetex LiveOps`.
- Under it, create the 8 databases exactly as specified in
  [docs/data-model.md](data-model.md) §3: Events, Venues, Equipment, Sessions,
  People, Participant Groups, Tasks, Change Log.
- Add every property listed in the mapping table. Relations first, or Notion
  will not let you create the dependent one.

### P0.3 — Create the integration and share

- Go to https://www.notion.so/my-integrations → **New integration** → internal.
- Copy the **Internal Integration Secret**.
- On the `Kinetex LiveOps` parent page: **⋯ → Connections → Connect to** your integration.

### P0.4 — Collect ids into `.env.local`

```bash
cp .env.example .env.local
```

Fill in:

```
KINETEX_SOURCE=notion
NOTION_TOKEN=secret_xxx
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_EVENTS=
NOTION_DB_VENUES=
NOTION_DB_EQUIPMENT=
NOTION_DB_SESSIONS=
NOTION_DB_PEOPLE=
NOTION_DB_GROUPS=
NOTION_DB_TASKS=
NOTION_DB_CHANGELOG=
```

To get a database id: open the database as a full page → the id is the 32-hex
string in the URL.

### P0.5 — Rehearse the demo once

- Open [docs/demo-script.md](demo-script.md), run the 90 seconds against the local seed.

**Done when:** `.env.local` has all ids, the databases exist with the right
properties, and the integration is connected to the parent page.
**Deliverable to the agent:** the values above (or the file), and a yes/no on
"databases created".

---

## Phase 1 — Real Notion source (highest value)

**Objective:** `KINETEX_SOURCE=notion` reads the workspace into the graph and
writes an approved change back as real Notion records.

**Why now:** It converts the biggest placeholder into the product's headline
claim. It is also the only phase with an external dependency, so it should not
sit at the end.

### Design decision owed (resolve before coding)

Today `EventSource` has `readGraph()` and `writeGraph(graph)`. Rewriting the
entire graph on every approval is wrong for Notion: it would touch every page.

**Recommended:** add one method to the interface:

```ts
applyApprovedChange(result: ApplyResult): Promise<void>;
```

- `local-source` implements it as today's `writeGraph(result.graph)`.
- `notion-source` implements it as an incremental write: update the one session
  page, create the approved task pages, create the one change log page, link them.
- Keep `writeGraph` for full-graph sync (seed scripts only).

Record this as ADR 0002 in `docs/decisions/`.

### Tasks

**Task 1.1 — Notion config + validation**
- Create: `lib/data/notion/config.ts`
- Read and validate the env vars; throw a single message listing every missing
  var. Export a typed `NotionConfig`.
- Update: `lib/data/notion-source.ts` to use it.
- Verify: `KINETEX_SOURCE=notion bun run build` still builds; a missing var
  throws a readable error.

**Task 1.2 — Page-to-entity mapping (pure)**
- Create: `lib/data/notion/mapping.ts`
- Pure functions: `pageToVenue(page)`, `pageToEquipment(page)`, … one per entity.
- No network. Unit-testable with fixture pages.
- Test: `tests/notion-mapping.test.ts` with one realistic Notion page fixture
  per entity, asserting the mapped record equals the expected domain object.
- Verify: `bun test`.

**Task 1.3 — readGraph**
- Modify: `lib/data/notion-source.ts`
- Query all 8 databases (paginated with `client.databases.query`), run the
  mapping, assemble the `EventGraph`.
- Verify: a script run `bun run verify:notion` prints counts matching the
  workspace, and `GET /api/graph?` returns the workspace graph.

**Task 1.4 — Seed script**
- Create: `scripts/seed-notion.ts`
- Reads `data/seed/event-graph.json` and creates the pages in the configured
  databases, then back-fills relations in a second pass.
- Verify: workspace shows the same 1 event / 3 venues / 4 sessions / 5 tasks as
  the seed.

**Task 1.5 — Incremental write-back**
- Modify: `lib/data/source.ts`, `lib/data/local-source.ts`, `lib/data/notion-source.ts`, `lib/engine/apply.ts` callers in `app/api/change/apply/route.ts`.
- Implement `applyApprovedChange` for both sources.
- Notion write: update session page's Venue relation; create a page per approved
  task with owner role, due date, and source change; create the Change Log page
  with relations to session, event, venues, and the created task pages.
- Verify: after approving in the UI, the Notion Change Log has a new row linked
  to the session, and the session's Venue relation changed.

**Task 1.6 — Opt-in integration test**
- Create: `tests/notion.integration.test.ts`
- `test.skipIf(!process.env.NOTION_TOKEN)` — reads the graph, asserts shape.
- Verify: passes with a token, skips without.

**Task 1.7 — Honesty pass**
- Update: `README.md`, `docs/demo-script.md`, `docs/data-model.md`,
  `docs/architecture.md`, `AGENTS.md`.
- Remove the "placeholder" non-claim **only for what is now real**, and only
  after Task 1.5 is verified against a live workspace.
- Keep: no webhook / instant-sync claim, no access-control claim.

**Phase 1 done when:** a change approved in the UI appears correctly in a real
Notion workspace and reads back changed on reload. Both the local and Notion
sources pass `bun test`, `bun run typecheck`, `bun run build`.

**Risks:** Notion rate limits on bulk reads (add a small delay + retry); property
type drift (validate on read and fail loudly); relation write order (create then link).

**Estimate:** 1 focused day, assuming the databases exist.

---

## Phase 2 — Post-event report + lesson compiler

**Objective:** Turn approved changes into a labeled post-event report and a short
list of reusable lessons. Closes the last step of the workflow.

**Why it matters:** The change log already holds everything needed. This phase
makes "and remembered" visible.

### Tasks

**Task 2.1 — Report builder (pure)**
- Create: `lib/engine/report.ts`
- `buildReport(graph, eventId): GeneratedReport` with `{ sections, lessons, generated, generator, sourceRecordIds }`.
- Lessons are derived by rule: e.g. a blocking capacity conflict that was
  approved → "reserve a fallback venue with ≥ N seats".
- Test: `tests/report.test.ts` — after applying the reference change, the report
  cites the change id and emits at least one lesson per blocking conflict.
- Verify: `bun test`.

**Task 2.2 — Report API**
- Create: `app/api/report/route.ts` (GET, `?eventId=`).
- Verify: `curl` returns a labeled report.

**Task 2.3 — Report screen**
- Create: `app/report/page.tsx`; add a nav link in `app/layout.tsx`.
- Show: event summary, changes list, conflicts that were approved, lessons,
  every source record linked.
- Verify: browser shows the report after applying a change.

**Task 2.4 — (ties to Phase 1) write the report to Notion**
- Create one page under the parent with the report body.
- Skip if Phase 1 is not done.

**Phase 2 done when:** an applied change produces an on-screen report with at
least one lesson and linked source records, and tests pass.

**Estimate:** 4–6 hours.

---

## Phase 3 — More change types

**Objective:** Widen beyond venue change without touching the graph or change log.

### Tasks

**Task 3.1 — Generalize the change model**
- Modify: `lib/domain/types.ts` — `ChangeType = "venue_change" | "time_change" | "resource_change" | "person_change"`; make `ChangeRequest` a discriminated union.
- Modify: `lib/engine/validate.ts` — validate each variant.
- Verify: existing tests still pass unchanged.

**Task 3.2 — Time change**
- Modify: `lib/engine/impact.ts` — branch per change type.
- Add rules to `lib/engine/conflicts.ts`: speaker/person double-booking, venue
  availability in the new slot, attendee overlap.
- Verify: new tests in `tests/engine.test.ts` for a time change.

**Task 3.3 — Resource change**
- Rules: equipment required elsewhere, maintenance windows, transport lead time.

**Task 3.4 — Person change**
- Rules: uncovered role, skill gap, briefing staleness.

**Task 3.5 — UI change-type selector**
- Modify: `components/ChangeConsole.tsx` — change type select drives which fields show.

**Task 3.6 — Rule registry**
- Refactor: introduce a `Rule` interface (`id`, `appliesTo`, `evaluate`) in
  `lib/engine/rules/`, one file per rule, so adding a rule is one file.
- Verify: no behavior change; all tests still pass.

**Phase 3 done when:** at least one non-venue change type runs end to end in the
UI, with tests.

**Estimate:** 1–2 days.

---

## Phase 4 — Volunteer reassignment

**Objective:** Flag affected and uncovered shifts, and propose skill-based
reassignments for approval. (Stretch in the brief; build only after Phase 3.)

### Tasks

- 4.1 Shift model: `shifts` entity (session, role, person, start, end) + seed data.
- 4.2 Coverage rule upgrades: detect uncovered shifts after a change.
- 4.3 Reassignment proposal: match `Person.skills` and availability; emit
  candidates as `ProposedFollowUp`s, never auto-apply.
- 4.4 UI: candidate list in the change console.
- 4.5 Tests for matching and coverage.
- Verify: after the reference change, at least one shift is flagged and at least
  one candidate is proposed.

**Estimate:** 1–2 days.

---

## Phase 5 — Webhooks, deploy, CI, hardening

**Objective:** Make it deployable and measurable.

### Tasks

- 5.1 GitHub Actions CI: `.github/workflows/ci.yml` running `bun install`,
  `bun test`, `bun run typecheck`, `bun run build` on push.
- 5.2 Deploy to Vercel; document env vars in the Vercel dashboard.
- 5.3 Notion webhook receiver `app/api/notion/webhook/route.ts`, with signature
  verification and idempotency. Keep the claim honest: no instant-sync promise.
- 5.4 Optional: minimal auth/role gate if role views are ever shown to others.
- 5.5 Error handling: surface adapter failures in the UI instead of a blank screen.
- Verify: CI green; deploy preview loads; webhook test event is accepted and deduped.

**Estimate:** 1 day (+ DNS/deploy friction).

---

## Phase 6 — Demo, rehearsal, release

**Objective:** Deliver the story without surprises.

### Tasks

- 6.1 Rehearse [docs/demo-script.md](demo-script.md) on both local and Notion sources.
- 6.2 Re-measure the numbers and update the script (no stale counts).
- 6.3 Re-read every non-claim and make sure the build still deserves each one.
- 6.4 Record a 90-second screen capture as a backup.
- 6.5 Tag `v0.1.0`; update `README.md` status block.

**Done when:** the demo runs twice in a row without manual fixes, and every
number you say is measured or labeled a placeholder.

---

## Parallelizable workstreams

If two people (or two agents) work at once:

| Track A | Track B |
|---|---|
| Phase 1 (Notion, needs owner access) | Phase 2 (report, no external deps) |
| Phase 3.1–3.2 (change model + time) | Phase 5.1–5.2 (CI + deploy) |

Do not run Phase 3 and Phase 4 in parallel; 4 depends on 3's coverage rules.

## Definition of done (whole project)

- `bun test`, `bun run typecheck`, `bun run build` pass in CI.
- One change type works end to end on the Notion source, verified live.
- A report screen turns approved changes into lessons.
- Every claim in `README.md` is backed by the build; every non-claim still holds.
- Demo rehearsed twice.

## Estimates

All estimates above are **estimates, not measurements**. Replace them with real
elapsed times as you finish each phase, and label them as such.
