# Decision Log

> Handoff Protocol `memory.md`. Running log of decisions, deviations, resolved
> unknowns, and new blockers. Update **in the same change** that makes the
> decision.

## 2026-10-02 — Project initialized

### Decisions

- **D-001** Stack = Next.js 15 App Router + TypeScript strict + Tailwind v4 + bun.
  *Why:* matches the owner's toolchain; server route handlers give Notion writes
  a home without a second service.
- **D-002** Local-first source with a Notion adapter. *Why:* demo must not depend
  on a live workspace; the integration point stays real. See ADR 0001.
- **D-003** Rules decide impact; the generated summary only explains and is
  labeled + source-linked. *Why:* testability and honesty; keeps generated text
  out of the decision path.
- **D-004** One change type (venue change) end to end before breadth. *Why:*
  tracer bullet; proves the shared-graph claim.
- **D-005** `applyChange` is the only writer and requires `approvedByRole`.
  *Why:* human approval is the product, not a checkbox.
- **D-006** Change IDs are sequential `chg-NNN`; follow-up task ids are
  `tsk-<changeId>-<followUpId>`. *Why:* deterministic, traceable, no uuid noise.
- **D-007** Repo is public at `Prithanjan/kinetex-liveops`. *Why:* judge-friendly
  link; matches the owner's public hackathon-repo habit.
- **D-008** Runtime graph state lives in `data/runtime/graph.json` (gitignored);
  reset deletes it. *Why:* durable across reloads, trivially resetable for a demo.
- **D-009** Seed event is "Kinetex Summit 2026"; reference change is
  `ses-keynote` → `ven-hall-b` with reason "roof leak". *Why:* yields a clear,
  copy-pasteable demo story.

### Resolved unknowns

- bun test resolves the `@/*` tsconfig path alias — verified, 8 tests pass.

### Deviations

- None from the agreed four decisions.

### Blockers

- **B-001** Notion adapter mapping is not implemented (needs a real workspace and
  database ids). Not blocking the offline demo; tracked as scope feature 6.
- **B-002** No post-event report screen yet; the change log data already supports
  it. Tracked as scope feature 7.

## 2026-10-02 — Phase 1 code + Phase 2

### Decisions

- **D-010** `EventSource` gains `applyApprovedChange(result)`; `writeGraph` stays
  for initial population only. *Why:* rewriting the whole workspace on each
  approval is wrong for Notion. Local implements it as a graph write; Notion
  updates only the affected pages.
- **D-011** The Notion schema is a single source of truth
  (`lib/data/notion/schema.ts`), used by the setup script, the reader, and the
  writer. *Why:* prevents property-name drift between creation and mapping.
- **D-012** Every Notion page carries a `Domain ID` rich text property.
  *Why:* write-back finds pages by domain id, never by matching human titles.
- **D-013** Change Log persists conflicts as JSON in a `Conflicts` rich text
  property. *Why:* the post-event report must derive lessons from what was
  actually detected, not from re-computing against an already-moved graph.
- **D-014** Change Log stores follow-up task ids as text, not a relation.
  *Why:* `Tasks.Source Change` already points at Change Log; a back-relation
  would be a cycle.
- **D-015** Database creation is automated (`bun run notion:setup`) instead of
  manual. *Why:* owner asked not to build the schema by hand; one shared page is
  the only irreducible manual step.
- **D-016** Secrets stay out of chat. The owner sets `NOTION_TOKEN` in
  `.env.local`; the agent never receives the token value. *Why:* vault rule
  (never store secrets) and basic hygiene.
- **D-017** Lessons are keyed by conflict kind and deduplicated. *Why:*
  deterministic and traceable; each lesson links the records that produced it.
- **D-018** Report and summary share `GENERATOR_LABEL`, which states it is not
  an LLM call. *Why:* one honest label, one place to change when a model is
  actually added.

### Verification at this commit

- `bun test` → 20 pass, 0 fail (engine 8, Notion mapping 8, report 4).
- `bunx tsc --noEmit` → clean.
- `bun run build` → compiled; 9 routes including `/report` and `/api/report`.
- Smoke test: apply via the new `applyApprovedChange` path wrote `chg-001` with
  7 tasks and 4 recorded conflicts; `/api/report` returned 1 change and 4
  lessons; reset restored the seed.

### Blockers

- **B-001 (open)** Notion live verification pending. Requires the owner to
  create one shared page and set two env values, then run `notion:setup` and
  `notion:seed`. Until then the placeholder non-claim stands as
  "mapping implemented, live verification pending".

### Historical verification at the initial commit

- `bun test` → 8 pass, 0 fail.
- `bunx tsc --noEmit` → clean.
- `bun run build` → compiled successfully.
- Smoke test: preview (13 affected, 4 conflicts, 7 follow-ups) → apply
  (`chg-001`, 7 tasks) → graph moved → reset → seed restored.

## 2026-10-02 — Notion live verification + Phase 3 preparation

### Decisions

- **D-019** `notion:setup` creates a workspace-level parent page itself when
  `NOTION_PARENT_PAGE_ID` is empty. *Why:* verified that internal integrations
  here can create a top level page, so the owner's only input is a token. See
  ADR 0002.
- **D-020** Added `bun run notion:doctor` as a permanent audit: access, visible
  pages, per-database record counts, and Domain ID integrity. *Why:* the honest
  way to prove integration health without reading code, and the mitigation for
  hand-edited Notion properties.
- **D-021** Schema ordering is a correctness rule: a relation requires its target
  database to exist. Order is events → equipment → people → groups → venues →
  sessions → changeLog → tasks. *Why:* the first setup run failed on exactly this
  (Tasks → Change Log). Now encoded in `NOTION_SCHEMA`, with a guard that throws
  and names the ordering bug instead of failing opaquely.
- **D-022** The Notion non-claim is retired for read/write and reworded: the
  integration is on-demand read/write, not a webhook sync. *Why:* verified live,
  but the webhook limitation is real and stays a non-claim.

### Live verification (measured, 2026-10-02)

- `notion:setup` created 1 parent page + 8 databases from the schema.
- `notion:seed` created 26 pages (1 event, 6 equipment, 5 people, 2 groups,
  3 venues, 4 sessions, 5 tasks).
- Read path: `GET /api/graph` with `KINETEX_SOURCE=notion` returned the identical
  graph (4 sessions, 5 tasks), relations translated to domain ids
  (`venueId: ven-main`, equipment list exact).
- Preview on Notion source: 13 affected, 4 conflicts, 7 follow-ups — identical to
  the local seed.
- Write path: approve wrote `chg-001`; re-read showed the session moved to
  `ven-hall-b`, 12 tasks, and 1 change log entry with 7 tasks linked.
- `/api/report` returned 1 change and 4 lessons on the Notion source.
- `notion:doctor` after the write: 34 records, 0 missing Domain IDs.

### Verification at this update

- `bun test` → 20 pass, 0 fail.
- `bunx tsc --noEmit` → clean.
- `bun run build` → compiled; 9 routes.

### Security

- The owner pasted the Notion token into chat. It was written only to
  `.env.local` (gitignored) and never to a committed file. **Action required:
  rotate the token in Notion after the demo** and re-run `bun run notion:setup`
  is not needed (ids are stable); only the token value changes.

### Blockers

- **B-001 closed** (Notion live verification).
- None open.

### Next

- Phase 3 preparation: spec 0002 (multi change types) written; implementation not
  started.

## 2026-10-02 — Phases 3 to 6

### Decisions

- **D-023** `ChangeRequest` is a discriminated union, not one wide type with
  optional fields. *Why:* optional fields let a builder forget a required input
  and still compile. The union makes that impossible, and `proposedSession()`
  turns any variant into a single session view so rules never branch on type.
- **D-024** Rules live in a registry (`lib/engine/rules/`), one file per concern,
  each declaring `appliesTo`. *Why:* the venue-change rules were one inline
  function; four change types would have made it one long switch. Adding a rule
  is now one file plus one line.
- **D-025** Every rule receives `{ current, proposed, index, change }` and reads
  only `proposed`. *Why:* keeps rules pure and comparable across change types.
- **D-026** Conflict carries an optional `ownerRole`. *Why:* follow-up planning
  needs an owner, and encoding it on the conflict removes a duplicate mapping
  table. Severity stays on the conflict; the lead time map stays in follow-ups.
- **D-027** Non-venue changes leave `fromVenueId`/`toVenueId` empty and carry a
  `changeLabel` string instead. *Why:* avoids a Notion schema migration, and the
  label is what the UI actually wants to show.
- **D-028** `notion:setup` reconciles schema drift: it adds properties and select
  options declared in the schema but missing in Notion, and never removes
  anything. *Why:* the live workspace already existed; without this, adding a
  change type would require destroying the workspace.
- **D-029** Notion write-back updates the whole session record, not just the
  changed field. *Why:* caught live. The first implementation only updated
  `Venue`, so a time change silently did not persist. One page update either way.
- **D-030** Phase 4 is deliberately lean: ranked candidate proposals marked
  "proposed, not assigned", never automatic reassignment. *Why:* the brief marks
  automatic reassignment as a stretch goal, and auto-assigning people is exactly
  the kind of action that should stay human-approved.
- **D-031** Design system is Anthropic-inspired: Pampas paper `#F4F3EE`, Crail
  terracotta `#C15F3C`, warm greys, serif display against a system sans, φ-derived
  type steps. *Why:* owner request; calm and editorial rather than dashboard-dark.
- **D-032** CI runs typecheck, tests, and build with `KINETEX_SOURCE=local`.
  *Why:* no credentials should be required to verify the repo.

### Verification (measured)

- `bun test` → 32 pass, 0 fail (engine 8, multi-change 12, Notion mapping 8,
  report 4).
- `bunx tsc --noEmit` → clean. `bun run build` → 9 routes.
- Live Notion: `notion:setup` reconciled 2 schema changes (Type options + Change
  property); `notion:reset` + `notion:seed` restored 26 pages; applying a **time
  change** wrote `chg-001` with 7 tasks and 4 conflicts, and the re-read showed
  the session's start/end persisted.

### Blockers

- **B-002 (open)** No deploy yet (Vercel needs owner auth). CI is in place.
- **B-003 (open)** Notion webhooks not built; the non-claim stands.

### Next

- Deploy to Vercel when the owner is ready, then wire a webhook receiver with
  signature verification and idempotency.
