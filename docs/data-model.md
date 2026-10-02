# Data Model

The event graph is a set of typed records joined by id. Notion holds the same
records as database pages; the local seed mirrors them.

## 1. Entities

### Event
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `date` | ISO date | |
| `status` | `planned` \| `in_planning` \| `live` \| `closed` | |

### Venue
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `capacity` | number | Seats; drives the capacity rule. |
| `equipmentIds` | string[] | Equipment physically present. |

### Equipment
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `type` | string | `audio`, `display`, `lighting`, `recording`, … |
| `status` | `available` \| `in_use` \| `maintenance` | Drives the availability rule. |

### Session
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `eventId` | → Event | |
| `title` | string | |
| `startTime` / `endTime` | ISO datetime | Overlap rule. |
| `venueId` | → Venue | The edge a venue change rewrites. |
| `requiredEquipmentIds` | → Equipment[] | Missing-equipment rule. |
| `assignedPersonIds` | → Person[] | Volunteer coverage. |
| `participantGroupIds` | → ParticipantGroup[] | Capacity + comms rules. |

### Person
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `roles` | Role[] | `organizer`, `logistics`, `volunteer_coordinator`, `communications`, `leadership` |
| `skills` | string[] | Reserved for the reassignment stretch goal. |

### ParticipantGroup
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `size` | number | Summed for capacity; recipients for comms. |

### Task
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | |
| `ownerRole` | Role | Drives role views. |
| `ownerPersonId` | → Person (optional) | |
| `sessionId` | → Session (optional) | |
| `status` | `todo` \| `in_progress` \| `done` \| `blocked` | |
| `dueAt` | ISO datetime | Derived from session start for follow-ups. |
| `sourceChangeId` | → ChangeLogEntry (optional) | Links a task to the change that created it. |

### ChangeLogEntry
| Field | Type | Notes |
|---|---|---|
| `id` | string | `chg-NNN` |
| `createdAt` | ISO datetime | |
| `changeType` | `venue_change` | |
| `eventId`, `sessionId` | → | |
| `fromVenueId`, `toVenueId` | → Venue | |
| `reason` | string (optional) | Human-supplied. |
| `affectedRecordIds` | string[] | The blast radius at approval time. |
| `followUpTaskIds` | string[] | Tasks created by this change. |
| `approvedByRole` | Role | Who approved. |
| `summary` | string | The labeled generated summary at approval time. |

## 2. Edges (the dependency graph)

```
Event ──< Session >── Venue ──< Equipment
             │  │
             │  └──< Person
             ├─────< ParticipantGroup
             └─────< Task ──> ChangeLogEntry
```

A venue change starts at `Session.venueId` and follows every edge outward.

## 3. Notion database mapping (target)

Create these databases under one parent page, then share the parent with the
integration. Set `NOTION_TOKEN` and `KINETEX_SOURCE=notion`.

| Notion database | Maps to | Key properties |
|---|---|---|
| Events | `events` | Name (title), Date, Status (select) |
| Venues | `venues` | Name (title), Capacity (number), Equipment (relation → Equipment) |
| Equipment | `equipment` | Name (title), Type (select), Status (select) |
| Sessions | `sessions` | Title (title), Event (relation), Start, End, Venue (relation), Required Equipment (relation), Assigned People (relation), Participant Groups (relation) |
| People | `people` | Name (title), Roles (multi-select), Skills (multi-select) |
| Participant Groups | `participantGroups` | Name (title), Size (number) |
| Tasks | `tasks` | Title (title), Owner Role (select), Owner (relation → People), Session (relation), Status (select), Due (date), Source Change (relation → Change Log) |
| Change Log | `changeLog` | Id (title), Type (select), Event/Session/From Venue/To Venue (relations), Reason (text), Affected Records (text), Follow-up Task IDs (text), Conflicts (text, JSON), Approved By (select), Summary (text), Created (date) |

Two deliberate additions to the brief's schema:

- **Domain ID** (rich text) on every database. It carries the domain id
  (`ses-keynote`) so write-back can find and update the exact page without
  matching on the human title.
- **Conflicts** (rich text, JSON) on Change Log. The conflicts detected at
  preview time are persisted with the approved change, so the post-event report
  derives lessons from what was actually found rather than re-computing against
  an already-moved graph.

Change Log keeps follow-up task ids as text rather than a relation, because
`Tasks.Source Change` already relates to Change Log and a back-relation would
create a cycle.

> **Status: implemented, pending live verification.** The mapping above is built
> (`lib/data/notion/*`) and `scripts/notion-setup.ts` creates the databases from
> `lib/data/notion/schema.ts`. Read and write paths are unit-tested against
> fixtures; they have not yet been run against a real workspace. Until they have,
> do not claim live sync: the honest statement is "mapping implemented, live
> verification pending". See [docs/notion-setup.md](notion-setup.md).

### 3.1 Automation

Do not create these databases by hand. Run `bun run notion:setup`, which builds
all eight from the schema, then `bun run notion:seed` to populate the demo. See
[docs/notion-setup.md](notion-setup.md) for the four manual steps (integration,
one shared page, two env values, one command).

## 4. Cardinality notes

- A session has exactly one venue; a venue has many sessions.
- A session requires many equipment items; equipment lives in many venues.
- A change log entry references exactly one session and one venue pair.
- A task may exist without a session (event-wide), as leadership tasks do.
