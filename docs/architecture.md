# Architecture

> Companion to `docs/PRD.md`. Decisions are recorded in `docs/decisions/`.

## 1. Shape

Kinetex LiveOps is a thin Next.js application wrapping a pure, deterministic
impact engine over a typed event graph. There are five layers.

```
┌──────────────────────────────────────────────────────────────┐
│ UI            dashboard · change console · role views          │
├──────────────────────────────────────────────────────────────┤
│ API           /api/graph · /api/change/preview · apply · reset │
├──────────────────────────────────────────────────────────────┤
│ Engine        traversal · conflicts · follow-ups · summary · apply│
├──────────────────────────────────────────────────────────────┤
│ Source        EventSource interface                            │
│               ├─ local-source (seeded JSON + runtime state)    │
│               └─ notion-source (placeholder adapter)           │
├──────────────────────────────────────────────────────────────┤
│ Domain        EventGraph types (single source of truth)        │
└──────────────────────────────────────────────────────────────┘
```

## 2. The one invariant

**Rules determine the impact; the explanation never does.**

`computeImpact` is deterministic. `buildSummary` only narrates what the rules
already produced, is marked `generated: true`, names its `generator`, and links
`sourceRecordIds`. Source facts (from the seed or Notion) stay distinguishable
from generated text everywhere in the system.

## 3. Layers

### Domain (`lib/domain/types.ts`)

The typed event graph: `events`, `venues`, `equipment`, `sessions`, `people`,
`participantGroups`, `tasks`, `changeLog`. Relationships are by id. This is the
only shape the engine and UI know.

### Source (`lib/data/`)

`EventSource` is a two-method interface: `readGraph()` and `writeGraph()`.

- `local-source`: reads `data/seed/event-graph.json` on first run, then
  `data/runtime/graph.json` once a change has been applied. `writeGraph`
  persists. `resetLocalGraph` deletes the runtime file.
- `notion-source`: the same interface backed by `@notionhq/client`. The mapping
  is a documented placeholder (see `docs/data-model.md`); it fails loudly and
  never silently pretends to have synced.

The engine never imports `fs` or the Notion client. Swapping sources is an env
change (`KINETEX_SOURCE`), not a rewrite.

### Engine (`lib/engine/`)

- `graph.ts` — indexing and edge helpers (co-located records, overlap, deadline math).
- `impact.ts` — `computeImpact`: resolves the session and target venue, then
  walks every typed edge to build the affected-record list.
- `conflicts.ts` — six deterministic rules. Each conflict carries a severity
  (`blocking` / `warning` / `info`) and the exact `recordIds` it read.
- `followups.ts` — maps conflicts to role-owned actions, plus three always-on
  coordination steps (volunteer re-brief, runbook/signage, leadership briefing).
- `summary.ts` — builds the labeled, source-linked explanation.
- `apply.ts` — `applyChange`: the only writer. Moves the session, creates the
  approved tasks, appends the linked change log entry, records the approving role.
- `validate.ts` — narrows untrusted request bodies to a `ChangeRequest`.

### API (`app/api/`)

| Route | Method | Behaviour |
|---|---|---|
| `/api/graph` | GET | Returns the current graph and its source. |
| `/api/change/preview` | POST | Returns an `ImpactReport`. Writes nothing. |
| `/api/change/apply` | POST | Requires an approving role. Writes the approved change. |
| `/api/reset` | POST | Deletes local runtime state for a clean demo replay. |

### UI (`app/`, `components/`)

- `/` dashboard — event status, sessions, open tasks by role, change log.
- `/change` — `ChangeConsole` (client): pick session and venue, preview, review
  affected records and conflicts, tick follow-ups, approve.
- `/roles` — role-filtered briefing over the same approved records.

## 4. Data flow of a change

```
ChangeRequest
   │
   ▼
computeImpact ──► fromVenue, toVenue, session
   │  traverse edges: equipment, people, groups, tasks
   ├─ detectConflicts (rules)      ──► Conflict[]
   ├─ proposeFollowUps             ──► ProposedFollowUp[]
   └─ buildSummary                 ──► GeneratedSummary (labeled)
   │
   ▼
ImpactReport (returned to UI; nothing written)
   │
   ▼  person approves, selects follow-ups, names role
applyChange
   ├─ session.venueId = newVenueId
   ├─ tasks += approved follow-ups   (sourceChangeId = chg-XXX)
   ├─ changeLog += linked entry
   └─ source.writeGraph(nextGraph)
```

## 5. Failure modes (by design)

- Unknown session or venue → `computeImpact` throws; API returns 422.
- Malformed body → API returns 400.
- Notion selected without config → adapter throws a list of missing env vars.
- Notion selected with config → adapter throws "placeholder, not implemented".
  It never returns a fake success.

## 6. Extension points

- **New change type:** add to `ChangeType`, branch in `computeImpact`, add rules
  and follow-up mappings. The graph and change log do not change.
- **Real AI summary:** replace `buildSummary` with a model call, keep the
  `generated` flag and `sourceRecordIds` contract, and update `generator`.
- **Real Notion mapping:** implement the two adapter methods against the
  database ids in `docs/data-model.md`.

## 7. Why this shape

See `docs/decisions/0001-tracer-bullet-local-first.md`. Short version: one
complete thread proves the hardest claim (dependency-aware, human-approved
change) before any breadth is added.
