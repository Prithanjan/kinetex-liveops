# ADR 0002 — Incremental Notion writes, single-source schema

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Prithanjan Acharyya

## Context

Phase 1 required a real Notion source. The original `EventSource` interface had
`readGraph()` and `writeGraph(graph)`. Writing the entire graph back on every
approval would touch every page in the workspace, which is wrong for a remote
service: it is slow, it risks clobbering manual edits, and it makes partial
failure likely.

Separately, the databases must be created and mapped. If creation and mapping are
written independently, property names drift and reads fail silently.

## Decision

1. **Widen `EventSource` with `applyApprovedChange(result)`.** Local implements it
   as a graph write. Notion implements it as an incremental write: create the one
   change log page, create only the tasks this change produced, update only the
   moved session's Venue relation. `writeGraph` remains for initial population
   only, and Notion's implementation throws.
2. **One schema definition.** `lib/data/notion/schema.ts` declares the databases
   and properties once. `notion-setup` builds from it; `mapping.ts` reads and
   writes by the same names.
3. **A `Domain ID` rich text property on every database.** Write-back finds a page
   by domain id, never by matching a human title.
4. **Change Log stores follow-up task ids as text**, not a relation, because
   `Tasks.Source Change` already relates to Change Log and a back relation would
   be a cycle.
5. **Automate provisioning.** `notion:setup` creates a workspace-level parent page
   and all eight databases, so the owner's only input is a token.

## Options considered

| Option | Why not |
|---|---|
| `writeGraph` rewrites everything on approval | Touches unrelated pages; slow; risks clobbering manual edits. |
| Separate property lists for setup and mapping | Drift; the exact class of bug that is invisible until runtime. |
| Match pages by title | Titles are human-editable; `ses-keynote` vs `Opening Keynote` breaks. |
| Bidirectional Tasks ↔ Change Log relations | Cycle at creation time; a relation needs its target to already exist. |
| Manual database creation | Error-prone and exactly what the owner asked to avoid. |

## Rationale

The interface should express intent (`apply an approved change`), not mechanism
(`write this whole blob`). That single change lets each source do the right thing
for its medium. The single-source schema is what makes automated provisioning
safe: the thing that creates the databases is the thing that reads them.

## Consequences

- Positive: verified live; one token is the only manual input; drift is
  structurally prevented; write-back is scoped and auditable.
- Negative: a property added by hand in Notion is not surfaced until a read fails.
  `bun run notion:doctor` is the mitigation.
- Follow-up: webhook ingestion is still not built; no instant-sync claim.

## References

- [docs/notion-setup.md](../notion-setup.md)
- [docs/implementation-plan.md](../implementation-plan.md) Phase 1
- [lib/data/notion/schema.ts](../../lib/data/notion/schema.ts)
