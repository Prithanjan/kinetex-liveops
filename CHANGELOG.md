# Changelog

All notable changes to Kinetex LiveOps. This project follows
[Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-10-02

First release: one change-to-closure workflow, four change types, real Notion
read/write, and a full design pass.

### Added

- **Event graph** (`lib/domain/types.ts`): events, venues, equipment, sessions,
  people, participant groups, tasks, and an append-only change log.
- **Impact engine** (`lib/engine/`): deterministic graph traversal, conflict
  detection, role-owned follow-up planning, and a labeled, source-linked summary.
- **Rule registry** (`lib/engine/rules/`): 14 rules across six files, each
  declaring which change types it applies to. Adding a rule is one file plus one
  line in the registry.
- **Four change types**: venue, time, resource, and person. Each previews impact,
  proposes follow-ups, and writes back only on approval.
- **Candidate proposals** (Phase 4, lean): uncovered roles surface ranked
  candidates by current load, marked "proposed, not assigned". Nothing is
  reassigned automatically.
- **Post-event report** (`/report`): lessons derived from conflicts persisted
  with each approved change.
- **Source adapters**: an offline seeded source and a real Notion source behind
  one `EventSource` interface.
- **Notion automation**: `notion:setup` creates a project page and eight
  databases from a single schema definition; `notion:present` applies icons, a
  cover, and template-style content; `notion:seed` and `notion:reset` manage demo
  data; `notion:doctor` audits access and record integrity.
- **Screens**: dashboard, change console, role briefings, post-event report.
- **Design system** (`app/globals.css`, `components/ui.tsx`): warm paper palette,
  terracotta accent, Fraunces display against Inter, golden-ratio type steps.
- **CI**: GitHub Actions runs typecheck, tests, and build on every push.
- **Docs**: PRD, architecture, data model, user flow, demo script, scope, specs,
  ADRs, decision log, build log, mechanism explanation, and `CHECKOUT.md`.

### Verified

- `bun test` → 32 tests passing (engine, multi-change, Notion mapping, report).
- `bunx tsc --noEmit` → clean.
- `bun run build` → 9 routes.
- Live Notion: read returned the identical graph; a venue change and a time
  change each wrote a linked change log entry, created task pages, and updated
  the session record. `notion:doctor` reported 0 records missing a Domain ID.

### Known limitations

- No Notion webhook sync: read/write is on demand. Edits made directly in Notion
  are not pushed instantly.
- Role views filter by role; they are not access-controlled.
- The generated summary is rules-based, not a model call.
- No deploy is configured in the repo (Vercel needs owner auth).
- No measured operational improvement is claimed; counts come from a seeded graph.

### Security

- The Notion token supplied during development was written only to `.env.local`
  (gitignored) and never committed. Rotate it in Notion if it was shared.
