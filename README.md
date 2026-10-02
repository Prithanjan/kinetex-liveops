# Kinetex LiveOps

**Change-aware event command center.** One line: Kinetex LiveOps turns event records into a dependency-aware command center, so when a plan changes it shows the operational impact, proposes role-owned follow-ups, and records approved decisions back into the source of truth.

One scenario runs end to end:

**Plan → detect dependencies → preview impact → assign follow-ups → approve and sync → brief each role → capture lessons**

## The reference demo

An organizer changes the main auditorium two hours before the event.

1. LiveOps reads the event's connected records.
2. Its dependency graph finds affected sessions, equipment, assigned people, and communication tasks.
3. A change preview shows conflicts and missing follow-ups before anything is applied.
4. It proposes actions with owners and deadlines for the right roles.
5. The organizer approves. LiveOps updates the operational records and writes a linked change log.
6. Each role sees its updated tasks and blockers; leadership sees event status and escalation risk.
7. The change log feeds a structured post-event report and reusable lessons.

## Architecture

```
Local seed  ─┐
             ├─►  EventSource (read/write)
Notion  ─────┘            │
                          ▼
              Event graph (typed entities + edges)
                          │
   Change request ──►  Impact engine
                          ├─ graph traversal  → affected records
                          ├─ conflict rules   → blocking / warning / info
                          ├─ follow-up planner→ role-owned tasks + deadlines
                          └─ summary builder  → labeled, source-linked text
                          │
                 Approval API (nothing written before a person approves)
                          │
              write-back: moved session + tasks + linked change log
                          │
        Role views · dashboard · post-event report
```

- **Rules determine impact; the summary only explains it.** Generated text is labeled and links the source records it read.
- **Two sources, one interface.** `KINETEX_SOURCE=local` runs fully offline on the seeded graph; `KINETEX_SOURCE=notion` switches to the Notion adapter.

## Quickstart

```bash
bun install
bun run dev          # http://localhost:3000
```

No environment variables are needed for the offline demo. To reset after applying a change:

```bash
curl -X POST http://localhost:3000/api/reset
```

### Connecting real Notion

One shared page is the only manual step; the scripts create the eight databases
and the demo data.

```bash
cp .env.example .env.local   # set NOTION_TOKEN + NOTION_PARENT_PAGE_ID
bun run notion:setup         # creates all 8 databases, writes ids to .env.local
bun run notion:seed          # populates the demo event
```

Full guide: [docs/notion-setup.md](docs/notion-setup.md).

## Commands

| Command | Purpose |
|---|---|
| `bun run dev` | Local dev server |
| `bun run build` | Production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | Engine unit tests |

## Project layout

```
app/                 Next.js App Router pages + API routes
  api/change/preview POST → impact report (writes nothing)
  api/change/apply   POST → approved write-back
  api/graph          GET  → current graph
  api/reset          POST → replay from seed
components/          Client command-center UI
lib/domain/types.ts  The typed event graph
lib/engine/          Traversal, conflicts, follow-ups, summary, report, apply
lib/data/            Source adapters (local, Notion)
lib/data/notion/     Notion schema (single source of truth), read, write, mapping
scripts/             notion:setup / notion:seed / notion:reset
data/seed/           Seeded event graph
docs/                PRD, architecture, data model, user flow, demo, spec, logs
tests/               Engine, Notion mapping, and report unit tests
```

## Documentation

- [docs/implementation-plan.md](docs/implementation-plan.md) — **phased build plan and the next step**
- [docs/notion-setup.md](docs/notion-setup.md) — connect a real workspace in four steps
- [docs/PRD.md](docs/PRD.md) — problem, users, requirements, acceptance criteria
- [docs/architecture.md](docs/architecture.md) — components and decisions
- [docs/data-model.md](docs/data-model.md) — entities and the Notion database mapping
- [docs/user-flow.md](docs/user-flow.md) — the change-to-closure flow, step by step
- [docs/demo-script.md](docs/demo-script.md) — timed demo script and explicit non-claims
- [docs/explanations/impact-engine.md](docs/explanations/impact-engine.md) — how impact is computed
- [docs/scope/scope.md](docs/scope/scope.md) — what is in and out of scope
- [docs/specs/0001-venue-change-impact-engine.md](docs/specs/0001-venue-change-impact-engine.md) — build spec
- [docs/decisions/0001-tracer-bullet-local-first.md](docs/decisions/0001-tracer-bullet-local-first.md) — architecture decision record
- [docs/memory/decision-log.md](docs/memory/decision-log.md) — running decision log
- [docs/logs/build-log.md](docs/logs/build-log.md) — build history

## Honest status (Measured-or-Placeholder)

- **Notion mapping is implemented but not yet verified live.** The schema, reader, writer, and setup scripts are built and the pure mapping is unit-tested. They have not been run against a real workspace. Say *"mapping implemented, live verification pending"*; do not claim live sync until `docs/notion-setup.md` verification passes.
- **The generated summary is rules-based, not an LLM call.** The `generator` field says so explicitly. No AI call is made in the current build.
- **Role views are role-filtered interfaces, not access-controlled.** No auth or permissions are implemented.
- **No claim of measured operational improvement.** Impact numbers are counts over the seed graph, not field metrics.
- Webhooks are a stretch goal. Notion documents webhook support, but some page-update events can be aggregated or delayed, so this build makes no instant-sync claim.

## License

MIT.
