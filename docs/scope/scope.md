# Kinetex LiveOps — Scope

> **Workflow:** Prototype → Alpha · Living document · Updated 2026-10-02
> Shape: At a glance table + phase-grouped feature sections.

## At a glance

| # | Feature | Phase | Status | Spec |
|---|---|---|---|---|
| 1 | Event graph + source adapters | 1 · Foundation | in-progress | [0001](../specs/0001-venue-change-impact-engine.md) |
| 2 | Venue-change impact engine | 1 · Foundation | in-progress | [0001](../specs/0001-venue-change-impact-engine.md) |
| 3 | Approval + write-back | 1 · Foundation | in-progress | [0001](../specs/0001-venue-change-impact-engine.md) |
| 4 | Command-center UI | 1 · Foundation | in-progress | [0001](../specs/0001-venue-change-impact-engine.md) |
| 5 | Role views + briefing | 1 · Foundation | in-progress | [0001](../specs/0001-venue-change-impact-engine.md) |
| 6 | Real Notion read/write mapping | 2 · Integration | planned | needs spec |
| 7 | Post-event report + lesson compiler | 2 · Integration | planned | needs spec |
| 8 | Additional change types (time, resource, person) | 3 · Breadth | done | [0002](../specs/0002-multi-change-types.md) |
| 9 | Volunteer reassignment | 3 · Breadth | done (lean) | [0002](../specs/0002-multi-change-types.md) |
| 10 | Notion webhook sync | 3 · Breadth | planned | needs spec |
| 11 | GitHub Actions CI | 3 · Breadth | done | CI workflow |
| 12 | Deploy (Vercel) | 3 · Breadth | planned | needs owner auth |

Legend: `planned` · `in-progress` · `done` · `existing` · `dropped`

---

## Phase 1 · Foundation (the tracer bullet)

### 1. Event graph + source adapters
A typed event graph and one `EventSource` interface with a local seed and a
Notion adapter.
**Done when:** the app reads the graph from a selectable source and resets to seed.
- [x] Domain types
- [x] Local seed source + runtime persistence
- [x] Notion adapter interface (placeholder mapping)
- [x] `/api/graph`, `/api/reset`

### 2. Venue-change impact engine
Deterministic traversal, conflict rules, follow-up planning, labeled summary.
**Done when:** one venue change yields affected records, conflicts, and owned follow-ups with tests green.
- [x] Traversal from the changed session
- [x] Six conflict rules with severities and cited records
- [x] Role-owned follow-ups with deadlines
- [x] Labeled, source-linked summary
- [x] Unit tests

### 3. Approval + write-back
Nothing is written before approval; approval records the role.
**Done when:** applying a change writes the move, tasks, and a linked change log entry.
- [x] `/api/change/preview` (read-only)
- [x] `/api/change/apply` with approving role
- [x] Change log entry

### 4. Command-center UI
Dashboard, change console, and a clean resetable demo.
**Done when:** the reference scenario runs from the UI without touching the API by hand.
- [x] Dashboard
- [x] Change console (preview, select, approve)
- [ ] Post-event report screen (deferred)

### 5. Role views + briefing
Role-filtered owned/open/blocked views over the same records.
**Done when:** each of the five roles sees its tasks and blockers.
- [x] Role filter navigation
- [x] Owned / open / blocked counts
- [ ] Access control (explicitly out of scope)

---

## Phase 2 · Integration

### 6. Real Notion read/write mapping
Implement `notion-source.readGraph`/`writeGraph` against the databases in
`docs/data-model.md`.
**Done when:** a change applied locally appears in a real Notion workspace and
reads back.
- [ ] Create databases + share with integration
- [ ] Implement mapping both directions
- [ ] Verify the change log page is linked to its session

### 7. Post-event report + lesson compiler
Turn the change log into a structured report and reusable lessons.
**Done when:** an approved change produces a labeled post-event section.

---

## Phase 3 · Breadth

### 8. Additional change types — **done**
Time, resource, and person changes reuse the same graph, rule registry, and
change log. 14 rules across 6 files; `lib/engine/rules/` 
### 9. Volunteer reassignment — **done (lean)**
Uncovered roles produce ranked candidate proposals (by current load), surfaced as
"proposed, not assigned". Automatic application is deliberately not built.
### 10. Notion webhook sync
React to Notion edits. Notion documents webhooks, but page-update events can be
aggregated or delayed; treat as stretch.

---

## Explicitly out of scope

- Access control between role views.
- Broad AI risk detection beyond the graph.
- Claiming instant Notion sync.
- Claiming measured operational improvement.
