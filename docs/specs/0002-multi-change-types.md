# 0002 — Multi Change Types + Rule Registry

**Status:** Proposed · **Mode:** FEATURE · **Date:** 2026-10-02
**Linked scope:** features 8 and 9 in [docs/scope/scope.md](../scope/scope.md)
**Depends on:** [spec 0001](0001-venue-change-impact-engine.md) (shipped, verified live)

## Summary

Widen the engine from one change type to four without touching the event graph or
the change log. Introduce a `Rule` registry so a new rule is one file, and a
discriminated `ChangeRequest` so a new change type is a type, a set of rules, and
a follow-up mapping.

The graph, the impact-report shape, the approval gate, and the write-back do not
change. That is the point of the tracer bullet: this phase widens a proven thread
instead of opening a new one.

## Requirements

| ID | Requirement |
|---|---|
| R1 | `ChangeRequest` becomes a discriminated union over `changeType`. |
| R2 | `computeImpact` dispatches per change type; the common traversal helper is shared. |
| R3 | Rules move to a registry: `{ id, appliesTo, evaluate(graph, change) -> Conflict[] }`. |
| R4 | Time change detects speaker and person double-booking, venue unavailability in the new slot, and attendee overlap. |
| R5 | Resource change detects equipment required elsewhere, maintenance windows, and transport lead time. |
| R6 | Person change detects uncovered roles, skill gaps, and stale briefings. |
| R7 | Follow-up planning maps each new conflict kind to an owner role and a deadline. |
| R8 | The change console exposes a change-type selector and only the fields that type needs. |
| R9 | Every existing test keeps passing unchanged; no behavior change for venue change. |
| R10 | The report derives lessons for the new conflict kinds. |

## Decision

- **Discriminated union, not optional fields.** `ChangeRequest` becomes
  `VenueChange | TimeChange | ResourceChange | PersonChange`. Optional fields on
  one wide type is the shape that produces silent bugs.
- **Rule registry.** Today the six checks are one inline function. A registry
  (`lib/engine/rules/`) makes each rule a file with an id and an `appliesTo`,
  which is what keeps Phase 3 from becoming one long switch.
- **Shared traversal, per-type expansion.** `computeImpact` keeps one anchor
  (the changed record) and one `affected[]` builder. Each change type supplies
  its own anchor resolution and its own rule set.
- **No engine dependency on source or UI.** Rules stay pure.

**Implementation skills:** Superpowers (TDD per rule), Handoff Protocol
(decision log in the same commit), Measured-or-Placeholder (new counts are
measured, not estimated).

## Design

### Change model

```ts
export interface VenueChange {
  changeType: "venue_change";
  eventId: string; sessionId: string; newVenueId: string; reason?: string;
}
export interface TimeChange {
  changeType: "time_change";
  eventId: string; sessionId: string; newStart: string; newEnd: string; reason?: string;
}
export interface ResourceChange {
  changeType: "resource_change";
  eventId: string; sessionId: string; addEquipmentIds: string[]; removeEquipmentIds: string[]; reason?: string;
}
export interface PersonChange {
  changeType: "person_change";
  eventId: string; sessionId: string; addPersonIds: string[]; removePersonIds: string[]; reason?: string;
}
export type ChangeRequest = VenueChange | TimeChange | ResourceChange | PersonChange;
```

`ChangeLogEntry` keeps its existing shape; `changeType` narrows, and `fromVenueId`
becomes type-specific fields (`fromX`/`toX`). Keep the venue fields for
`venue_change` and add parallel optional fields so old entries stay readable.
Decide this in implementation and record it; the migration must not break the
26 seeded pages.

### Rule registry

```
lib/engine/rules/
├── index.ts            # registry: all rules + appliesTo filtering
├── types.ts            # Rule interface
├── capacity.ts         # exists today, moved
├── equipment.ts        # missing + unavailable, moved
├── schedule.ts         # overlap (extended for time change)
├── communication.ts    # gap, moved
├── coverage.ts         # extended for person change
├── maintenance.ts      # new (resource)
└── transport.ts        # new (resource)
```

```ts
export interface Rule {
  id: string;
  appliesTo: ChangeRequest["changeType"][];
  evaluate(graph: EventGraph, change: ChangeRequest): Conflict[];
}
```

### API surface

Unchanged routes. `POST /api/change/preview` and `/apply` accept the wider
`ChangeRequest`. `lib/engine/validate.ts` validates each variant.

### Edge cases

- A time change that lands outside event hours → `info`, not blocking.
- A resource change that removes equipment the session does not require → no
  conflict.
- A person change that removes the last owner of a required role → `blocking`.
- An unknown `changeType` → 400 with the supported list.
- Every existing venue-change behavior is byte-identical.

## Build plan

Ordered, each task independently testable. TDD: failing test, then code.

- [ ] **Task 1** — Introduce the discriminated union in `lib/domain/types.ts`; keep `venue_change` working. Extend `validate.ts`. Run all existing tests; they must pass untouched. (R1, R9)
- [ ] **Task 2** — Extract `lib/engine/rules/` registry; move the six existing checks into rule files with no behavior change. Add `lib/engine/rules/index.ts`. (R3, R9)
- [ ] **Task 3** — Make `computeImpact` dispatch on `changeType` with one shared traversal helper. (R2)
- [ ] **Task 4** — `time_change`: anchor + rules (person double-booking, venue slot conflict, attendee overlap) + follow-up mapping + tests. (R4, R7)
- [ ] **Task 5** — `resource_change`: rules (required elsewhere, maintenance, transport lead time) + follow-ups + tests. (R5, R7)
- [ ] **Task 6** — `person_change`: rules (uncovered role, skill gap, stale briefing) + follow-ups + tests. (R6, R7)
- [ ] **Task 7** — Change Log migration: add type-specific fields without breaking the existing 26 pages; update Notion mapping + schema and re-run `notion:setup` safely. Verify a venue-change entry still round-trips.
- [ ] **Task 8** — Change console: type selector, per-type fields, all four through preview → approve. (R8)
- [ ] **Task 9** — Report: lesson templates for the new conflict kinds. (R10)
- [ ] **Task 10** — Live verification on the Notion source for one non-venue change; update docs and the decision log.

## Acceptance criteria

- **AC-1** All pre-existing tests pass with no edits to expectations.
- **AC-2** A time change to an overlapping slot reports a blocking conflict citing the clashing session.
- **AC-3** A person change removing the last logistics owner reports a blocking coverage conflict.
- **AC-4** A resource change removing equipment the session does not require reports nothing.
- **AC-5** Each new change type runs through the UI to write-back on the Notion source.
- **AC-6** `bun test`, `bun run typecheck`, `bun run build` pass.

## Consequences

- Positive: four change types on one verified thread; adding a rule is one file.
- Negative: `ChangeLogEntry` gains type-specific fields and needs a migration path.
- Risk: the rule registry is a refactor of working code. Mitigation: Task 2 is
  behavior-preserving and gated on the untouched existing tests.

## Rationale

Widening a proven thread is cheap; widening an unproven one spreads risk. The
single graph and single change log are what make four change types one product
rather than four features. See [ADR 0001](../decisions/0001-tracer-bullet-local-first.md).
