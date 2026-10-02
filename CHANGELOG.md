All notable changes to Kinetex LiveOps. This project follows
[Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-10-03

Redesign pass, driven by what a person sees rather than what the code does.
Every screen and the whole Notion workspace were rebuilt around plain language,
and the repeated card-and-stat chrome was cut back.

### Changed

- **Notion is now two pages with two jobs.** `notion:present` creates a home
  page (`🏠 Kinetex LiveOps`) with a cover, an intro, the seven-step loop, the
  roles, and the honesty notes, and renames the database page to
  `📚 Event data`. The home page id is stored as `NOTION_HOME_PAGE_ID`.
- **The database list reads as an index, not a dump.** Each database now has an
  emoji icon, a Notion description, a caption saying what it is for, and a
  per-table reading guide naming the column that carries the meaning, grouped
  under four colour-coded sections.
- **`notion:present` is idempotent without a marker.** It rebuilds its own blocks
  on every run instead of detecting a marker string. The raw
  `KINETEX-PRESENT-V1` line is gone from the workspace entirely.
- **Select options carry colours** (green is free, red needs a person) in the
  schema. Notion's API cannot recolour an existing option, so `notion:setup`
  reports the exact manual list for a workspace created before this change, and
  a fresh workspace gets them automatically.
- **Web screens rewritten page by page**: a briefing-style dashboard, a guided
  change console, a roles board, and an editorial report. Generated ids, raw
  relation keys, entity names, and `source.kind` chips are gone from the UI.
- **Charts drawn as plain SVG** (`components/charts.tsx`): a progress ring, a
  bar series, and a blast-radius graph. No chart library, no external images.
- **Less repeated chrome.** Stat strips that repeated numbers already on the
  page were removed, and explanatory paragraphs were cut to one line.

### Added

- `lib/format.ts`: countdown, time, day, pluralisation, role blurbs, and
  plain-language relation/severity/status labels, so no screen has to invent its
  own wording.
- `readGuide` on every Notion database spec.

### Verified

- `bun test` → 32 pass, 0 fail. `bunx tsc --noEmit` → clean. `bun run build` →
  9 routes.
- Live routes `/`, `/change`, `/roles`, `/roles?role=logistics`, `/report` →
  HTTP 200 against the live Notion source.
- Live Notion: home page created, data page renamed and sectioned, 8 captions
  and 4 section markers written, `notion:setup` reconciled cleanly.

### Still not claimed

- Notion's public API cannot create board, gallery, calendar, or timeline views,
  and cannot recolour an existing select option. Board-style layouts are a
  manual step in Notion; the reading guides stand in for them.

## [1.0.0] — 2026-10-02

First release: one change-to-closure workflow, four change types, real Notion
read/write, and a full design pass.
