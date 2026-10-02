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
