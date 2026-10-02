# Kinetex LiveOps  ·  v1.1.0
**Change-aware event command center.** One line: Kinetex LiveOps turns event records into a dependency-aware command center, so when a plan changes it shows the operational impact, proposes role-owned follow-ups, and records approved decisions back into the source of truth.

One scenario runs end to end:

**Plan → detect dependencies → preview impact → assign follow-ups → approve and sync → brief each role → capture lessons**

## The Notion workspace (design pass)

The integration is now two pages with two jobs:

- **`🏠 Kinetex LiveOps`** — the page a person opens first. Cover, icon, a plain-
  language intro, the seven steps as illustrated cards, who each role serves, and
  an honest note about what the writing does and does not claim.
- **`📚 Event data`** — the eight databases, each with an emoji icon, a
  description, a caption reading like a real template, and a per-table reading
guide that names the column that carries the meaning, grouped into four
colour-coded sections. The change log is the audit trail; the task board is
where each role opens its day.

`notion:present` is re-runnable and rebuilds itself cleanly; there is no marker
text left in the workspace.

Four change types run through the same graph, the same rule registry, and the
same change log: **venue**, **time**, **resource**, and **person** changes.
Where a role is left uncovered, the engine proposes ranked candidates for a human
to accept; it never reassigns on its own.

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

The only input is an integration token. The scripts create a top level project
page, all eight databases with their properties and relations, and the demo
data. Open the resulting workspace in Notion and start at `🏠 Kinetex LiveOps` —
`📚 Event data` holds the eight databases with their reading guides.

```bash
cp .env.example .env.local   # set NOTION_TOKEN only
bun run notion:all           # setup + present + seed, in one command
bun run notion:doctor        # audit: access, record counts, Domain IDs
```

Or run them individually: `notion:setup` (project page + 8 databases),
`notion:present` (page icon, cover, and template content), `notion:seed` (demo
data), `notion:reset` (archive and start over).

Full guide: [docs/notion-setup.md](docs/notion-setup.md).

## Commands

| Command | Purpose |
|---|---|
| `bun run dev` | Local dev server |
| `bun run build` | Production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | Engine unit tests |
| `bun run notion:all` | Setup + present + seed in one go (the full dashboard start) |
| `bun run notion:all` | Setup + present + seed in one go (the full dashboard start) |

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

- [**CHECKOUT.md**](CHECKOUT.md) — **how to run, tour, and verify everything**
- [CHANGELOG.md](CHANGELOG.md) — release notes (v1.1.0)
- [docs/design-system.md](docs/design-system.md) — palette, type, and layout rules
- [docs/implementation-plan.md](docs/implementation-plan.md) — phased build plan
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

- **Notion read and write are verified against a live workspace** (2026-10-02): 26 seeded pages read back with identical domain ids and relations; an approved change created a linked Change Log row, 7 task pages, and updated the session's Venue relation; `notion:doctor` reported 34 records with no missing Domain IDs. This integration is on-demand read/write, not a webhook sync.
- **The generated summary is rules-based, not an LLM call.** The `generator` field says so explicitly. No AI call is made in the current build.
- **Role views are role-filtered interfaces, not access-controlled.** No auth or permissions are implemented.
- **No claim of measured operational improvement.** Impact numbers are counts over the seed graph, not field metrics.
- **Notion can't do views.** Board, gallery, calendar, and timeline layouts are not creatable through Notion's public API, and existing select options cannot be recoloured — the reading guides in `📚 Event data` stand in for those layouts. On a fresh workspace, database options are coloured automatically.
- **Webhooks are a stretch goal.** Notion documents webhook support, but some page-update events can be aggregated or delayed, so this build makes no instant-sync claim.

## License

MIT.
