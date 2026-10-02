# Decision Log

> Handoff Protocol `memory.md`. Running log of decisions, deviations, resolved
> unknowns, and new blockers. Update **in the same change** that makes the
> decision.

## 2026-10-02 — Project initialized

### Decisions

- **D-001** Stack = Next.js 15 App Router + TypeScript strict + Tailwind v4 + bun.
  *Why:* matches the owner's toolchain; server route handlers give Notion writes
  a home without a second service.
- **D-002** Local-first source with a Notion adapter. *Why:* demo must not depend
  on a live workspace; the integration point stays real. See ADR 0001.
- **D-003** Rules decide impact; the generated summary only explains and is
  labeled + source-linked. *Why:* testability and honesty; keeps generated text
  out of the decision path.
- **D-004** One change type (venue change) end to end before breadth. *Why:*
  tracer bullet; proves the shared-graph claim.
- **D-005** `applyChange` is the only writer and requires `approvedByRole`.
  *Why:* human approval is the product, not a checkbox.
- **D-006** Change IDs are sequential `chg-NNN`; follow-up task ids are
  `tsk-<changeId>-<followUpId>`. *Why:* deterministic, traceable, no uuid noise.
- **D-007** Repo is public at `Prithanjan/kinetex-liveops`. *Why:* judge-friendly
  link; matches the owner's public hackathon-repo habit.
- **D-008** Runtime graph state lives in `data/runtime/graph.json` (gitignored);
  reset deletes it. *Why:* durable across reloads, trivially resetable for a demo.
- **D-009** Seed event is "Kinetex Summit 2026"; reference change is
  `ses-keynote` → `ven-hall-b` with reason "roof leak". *Why:* yields a clear,
  copy-pasteable demo story.

### Resolved unknowns

- bun test resolves the `@/*` tsconfig path alias — verified, 8 tests pass.

### Deviations

- None from the agreed four decisions.

### Blockers

- **B-001** Notion adapter mapping is not implemented (needs a real workspace and
  database ids). Not blocking the offline demo; tracked as scope feature 6.
- **B-002** No post-event report screen yet; the change log data already supports
  it. Tracked as scope feature 7.

### Verification at this commit

- `bun test` → 8 pass, 0 fail.
- `bunx tsc --noEmit` → clean.
- `bun run build` → compiled successfully.
- Smoke test: preview (13 affected, 4 conflicts, 7 follow-ups) → apply
  (`chg-001`, 7 tasks) → graph moved → reset → seed restored.
