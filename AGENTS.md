# AGENTS.md — Kinetex LiveOps

Project context for any AI agent or human working here.

## What this is

A change-aware event command center built as a tracer bullet: one venue-change
scenario running end to end through every layer (source → graph → impact engine
→ approval API → write-back → role views).

Read `ORIGINAL_REQUEST.md` first, then `docs/implementation-plan.md` (the phased
plan and current phase), then `docs/memory/decision-log.md`, then the specific
doc for your task.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict)
- Tailwind CSS v4
- bun (package manager, test runner)
- `@notionhq/client` for the (placeholder) Notion adapter

## Commands

```bash
bun install
bun run dev
bun run typecheck
bun test
bun run build

# Notion workspace automation (needs NOTION_TOKEN + NOTION_PARENT_PAGE_ID in .env.local)
bun run notion:setup   # create the 8 databases, write ids to .env.local
bun run notion:seed    # populate the demo event
bun run notion:reset   # archive all pages for a clean re-seed
```

## Conventions

- Rules decide impact; the summary only explains it. Never let generated text
  silently become the source of a decision.
- Generated output must be labeled (`generated: true`, named `generator`) and
  must link its `sourceRecordIds`.
- Every number is measured or labeled a placeholder. No third category.
- The engine is pure and deterministic. Sources own I/O; the engine never
  imports `fs` or the Notion client.
- Nothing is written before a person approves. Approval records the role.
- Keep `docs/memory/decision-log.md` updated in the same change that makes a
  decision.
- Prefer editing existing files. Keep the tracer bullet thin.

## Where things live

| Area | Path |
|---|---|
| Domain model | `lib/domain/types.ts` |
| Engine | `lib/engine/*` |
| Sources | `lib/data/*` |
| Notion schema (single source of truth) | `lib/data/notion/schema.ts` |
| Notion read/write | `lib/data/notion/*` |
| Notion scripts | `scripts/notion-*.ts` |
| API | `app/api/*` |
| UI | `app/*`, `components/*` |
| Seed graph | `data/seed/event-graph.json` |
| Runtime state (gitignored) | `data/runtime/graph.json` |
| Docs | `docs/*` |

## Verified capabilities (2026-10-02)

- Notion read and write are verified live: 26 seeded pages read back with
  identical domain ids and relations; an approved change wrote a linked Change
  Log row, 7 task pages, and updated the session's Venue relation.
- `bun run notion:doctor` audits access, record counts, and Domain ID integrity.

## Non-claims (do not contradict these)

- Notion integration is **on-demand read/write**, not a webhook sync. Do not
  claim instant synchronization for edits made directly in Notion.
- Never receive the Notion token in chat. The owner sets it in `.env.local`. If a
  token is ever pasted into a log, tell the owner to rotate it.
- The summary is rules-based, not an LLM call.
- Role views are not access-controlled.
- No measured operational improvement is claimed.
- Webhooks are a stretch goal; no instant-sync claim.

## Agent skills available in the owner's vault

Architect, Scope, Writing Plans, Superpowers (TDD, systematic debugging),
Handoff Protocol, Demo-Script Discipline, Measured-or-Placeholder,
Explain-to-Never-Forget. Apply the relevant one; keep changes atomic and
verified.
