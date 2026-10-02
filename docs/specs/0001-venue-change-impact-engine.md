# 0001 — Venue-Change Impact Engine (tracer bullet)

**Status:** Proposed · **Mode:** FEATURE · **Date:** 2026-10-02
**Linked scope:** features 1–5 in [docs/scope/scope.md](../scope/scope.md)

## Summary

Build the thinnest complete thread through every layer for one change type:
a venue change. The thread runs source → graph → traversal → conflicts →
follow-ups → approval → write-back → role views. If this thread works, every
other capability hangs off the same graph and change log.

## Requirements

| ID | Requirement |
|---|---|
| R1 | Read the event graph from a selectable source. |
| R2 | Compute affected records by following typed edges from the changed session. |
| R3 | Detect conflicts deterministically, each with a severity and cited record ids. |
| R4 | Propose role-owned follow-ups with deadlines. |
| R5 | Produce a generated summary labeled as generated, naming its generator, linking source records. |
| R6 | Write nothing before an approval that names the approving role. |
| R7 | On approval, write the moved session, the tasks, and one linked change log entry. |
| R8 | Expose role-filtered views over the same records. |
| R9 | Reset to seed for a repeatable demo. |

**Acceptance criteria:** AC-1 … AC-7 in [docs/PRD.md](../PRD.md).

## Decision

- **Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4, bun.
- **Source:** `EventSource` interface; local seed adapter built, Notion adapter
  is a documented placeholder. Offline-safe demo.
- **Impact:** a pure, deterministic engine. Rules decide; the summary explains.
- **Approval:** `applyChange` is the only writer and requires `approvedByRole`.
- **Build approach:** Tracer Bullet.

**Implementation skills:** Superpowers (TDD), Handoff Protocol (this spec +
decision log), Measured-or-Placeholder (labels and non-claims).

## Design

### Data model

Entities: `events`, `venues`, `equipment`, `sessions`, `people`,
`participantGroups`, `tasks`, `changeLog`. Full field list in
[docs/data-model.md](../data-model.md). No new entities are added for MVP.

### Engine

`computeImpact(graph, change: ChangeRequest): ImpactReport`

1. Resolve session and target venue; throw on unknown ids.
2. Build `affected[]` by walking: session → both venues → required equipment →
   assigned people → participant groups → session tasks.
3. `detectConflicts`: capacity, missing equipment, unavailable equipment,
   schedule overlap, communication gap, coverage gap.
4. `proposeFollowUps`: one action per conflict + volunteer re-brief + runbook +
   leadership briefing.
5. `buildSummary`: labeled, source-linked narrative.

`applyChange(graph, change, approvedByRole, { selectedFollowUpIds })`

1. Recompute impact.
2. Filter follow-ups to the selected ids.
3. Move `session.venueId`, append tasks with `sourceChangeId`, append the
   change log entry.

### API surface

`GET /api/graph` · `POST /api/change/preview` · `POST /api/change/apply` ·
`POST /api/reset`

### Edge cases

Unknown ids → 422. Malformed body → 400. Missing role → 400. No conflicts →
follow-ups still proposed. Notion unconfigured/unimplemented → throw, never fake.

## Build plan

Ordered by the tracer bullet: stand up one thin thread through every layer, then
thicken hardening only if time remains.

- [x] Task 1 — Domain types (`lib/domain/types.ts`).
- [x] Task 2 — Seed graph (`data/seed/event-graph.json`).
- [x] Task 3 — Source interface + local adapter + Notion placeholder.
- [x] Task 4 — Graph helpers (`lib/engine/graph.ts`).
- [x] Task 5 — Conflict rules (`lib/engine/conflicts.ts`).
- [x] Task 6 — Follow-up planner (`lib/engine/followups.ts`).
- [x] Task 7 — Summary builder (`lib/engine/summary.ts`).
- [x] Task 8 — Impact assembly (`lib/engine/impact.ts`).
- [x] Task 9 — Apply/write-back (`lib/engine/apply.ts`).
- [x] Task 10 — API routes.
- [x] Task 11 — UI: dashboard, change console, role views.
- [x] Task 12 — Engine tests (8 passing).
- [x] Task 13 — Docs.
- [ ] Task 14 — Real Notion mapping (separate spec).

## Consequences

- Positive: one verified thread; a single invariant (rules decide, summary
  explains); sources are swappable without touching the engine.
- Negative: only one change type; Notion is not yet real; no auth.
- Follow-up: real Notion mapping, more change types, post-event report screen.

## Rationale

See [docs/decisions/0001-tracer-bullet-local-first.md](../decisions/0001-tracer-bullet-local-first.md).
