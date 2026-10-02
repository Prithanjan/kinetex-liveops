# How the Impact Engine Works

> Written in the "explain so you never forget" style: line by line, shape aware,
> mechanism over API, ending with a compact re-derivable summary.

## 1. The one idea

A change does not need AI. It needs **connections**. The engine treats the event
as a graph and answers one question: *starting from the record that changed,
which other records does it touch, and what rules do those records break?*

Everything else (the summary, the UI) is presentation.

## 2. Shapes at each stage

This is the "what goes in → what shape is it → what happens → what comes out"
walk.

| Stage | Goes in | Shape | Happens | Comes out |
|---|---|---|---|---|
| Read | source | `EventGraph` = 8 arrays | Load records | `{ events[], venues[], sessions[], … }` |
| Resolve | `ChangeRequest` | one object | Find session, target venue | `Session`, `Venue` |
| Traverse | `Session` + graph | list of edges | Follow ids outward | `AffectedRecord[]` (flat list) |
| Detect | graph + session | rules | 6 checks | `Conflict[]` |
| Plan | conflicts + session | mapping | conflict → owner + deadline | `ProposedFollowUp[]` |
| Explain | all the above | strings | Narrate only | `GeneratedSummary` |
| Apply | graph + approval | mutation | rewrite + append | new `EventGraph` + `ChangeLogEntry` |

Notice every intermediate is a **flat array**. The graph is an emergent
structure created by id references, not nested objects. That is why traversal is
simple and cheap.

## 3. Traversal, line by line

`lib/engine/impact.ts` — `computeImpact`:

```ts
const index = indexGraph(graph);              // arrays -> Maps, O(n), lookup O(1)
const session = index.sessions.get(change.sessionId);   // the changed record
const fromVenue = index.venues.get(session.venueId);    // where it was
const toVenue = index.venues.get(change.newVenueId);    // where it goes
```

`indexGraph` turns each array into a `Map<id, record>`. Without it, every lookup
is a linear scan; with it, the whole traversal is linear in the graph size.

Then the affected list is built by following typed edges:

```ts
affected.push({ id: session.id, entity: "sessions", relation: "changed_record" });
affected.push({ id: fromVenue.id, entity: "venues", relation: "releasing_venue" });
affected.push({ id: toVenue.id,   entity: "venues", relation: "receiving_venue" });

for (const item of requiredEquipment(graph, session))  // Equipment
  affected.push({ ..., relation: "required_by_session" });
for (const person of peopleForSession(graph, session)) // Person
  affected.push({ ..., relation: "assigned_to_session" });
for (const group of participantsForSession(...))       // ParticipantGroup
  affected.push({ ..., relation: "invited_to_session" });
for (const task of tasksForSession(graph, session.id)) // Task
  affected.push({ ..., relation: "follows_session" });
```

Each pushed record carries a `relation` string. That string is the *why* — it is
what lets the UI say "this equipment is affected because the session requires
it," instead of just listing ids.

## 4. Conflict rules

`lib/engine/conflicts.ts` — rules run in a fixed order and each returns a
`Conflict` with a `severity` and the `recordIds` it read.

1. **Capacity** — sum participant-group sizes; compare to venue capacity.
2. **Missing equipment** — required equipment ids not in `venue.equipmentIds`.
3. **Unavailable equipment** — required equipment whose `status !== "available"`.
4. **Schedule overlap** — other sessions in the target venue whose
   `[start, end)` intervals intersect.
5. **Communication gap** — no *open* communications task references the session.
6. **Coverage gap** — assigned people do not span a `logistics` role.

Two properties matter:

- **Determinism.** Same graph + same change = same conflicts, every time.
- **Provenance.** Every conflict carries `recordIds`, so the explanation can
  point back at facts instead of asserting them.

Overlap math (in `graph.ts`) is contained in its own function:

```ts
return aStart < bEnd && bStart < aEnd;   // half-open interval intersection
```

## 5. From conflicts to owners

`lib/engine/followups.ts` switches on `conflict.kind` and emits an action with:

- `ownerRole` — which team owns the fix,
- `dueAt` — computed as `session.startTime − N hours` (the deadline scales with
  how early the work must happen),
- `reason` — the conflict message, so the task explains itself,
- `relatedRecordIds` — the records to open.

Three always-on steps are added regardless of conflicts (volunteer re-brief,
runbook/signage, leadership briefing), because a venue change is never zero work.

`hoursBefore` is pure subtraction on `Date.parse`, so deadlines are stable:

```ts
new Date(Date.parse(iso) - hours * 3600_000).toISOString();
```

## 6. Why the summary cannot lie

`lib/engine/summary.ts` receives facts that are already decided. It builds a
string and returns:

```ts
{ text, generated: true, generator: "rules-based explanation v0 (not an LLM call)",
  sourceRecordIds: [...] }
```

Three guarantees fall out of that shape:

- `generated: true` marks it as machine text.
- `generator` names exactly how it was made — so nobody can imply an LLM call
  that never happened.
- `sourceRecordIds` links every fact back to a record.

Swap in a real model later and the contract does not change — only `generator`
becomes honest about the model.

## 7. The only writer

`lib/engine/apply.ts` is the single place that mutates the graph:

```ts
const report = computeImpact(graph, change);              // recompute first
const selected = filterToSelected(report.followUps, ids); // human choice
const changeId = nextChangeId(graph);                     // chg-001, chg-002, ...
nextTasks  = selected.map(toTask(changeId));              // tasks carry sourceChangeId
nextGraph  = { ...graph,
  sessions: graph.sessions.map(s => s.id === change.sessionId
    ? { ...s, venueId: change.newVenueId } : s),
  tasks: [...graph.tasks, ...nextTasks],
  changeLog: [...graph.changeLog, entry] };               // append, never overwrite
```

The spread (`...graph`) pattern means the function returns a **new** graph
instead of mutating in place. That makes the write-back easy to reason about and
easy to persist: the caller writes the whole new graph through `EventSource`.

## 8. Compact summary (re-derive from this)

- The event is a graph built from id references across 8 flat arrays.
- `indexGraph` turns arrays into Maps so lookups are O(1).
- `computeImpact` walks edges from the changed session and labels each record
  with the relation that connected it.
- Six deterministic rules turn connections into conflicts; each conflict cites
  its records.
- Conflicts map to role-owned tasks with deadlines derived from session start.
- The summary is labeled, names its generator, and links source records; it
  explains, never decides.
- `applyChange` is the only writer; it recomputes, filters to the human's
  selection, moves the session, appends tasks, and appends one linked change log
  entry, returning a new graph.

If you can restate those seven lines and point to the file for each, you
understand the engine.
