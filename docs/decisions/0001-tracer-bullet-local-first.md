# ADR 0001 — Tracer bullet, local-first

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Prithanjan Acharyya

## Context

The brief describes five capabilities (blast-radius graph, staged simulator,
shift weaver, role runbooks, memory compiler). Building all five breadth-first
would produce five shallow demos and no verifiable loop. The pitch's real claim
is that all five share one event graph and one change log. That claim is only
provable if a single change runs end to end.

Additionally, the Notion integration is the highest-risk part: it needs a
workspace, databases, and a token that may not exist at build time.

## Decision

1. **Tracer Bullet.** Build one venue-change thread through every layer
   (source → engine → API → UI → write-back) before adding breadth.
2. **Local-first source.** Ship an offline seeded source as the default. Define
   an `EventSource` interface and a Notion adapter that fails loudly while its
   mapping is a placeholder. The demo never depends on Notion being live.
3. **Rules decide, summary explains.** The engine is deterministic; the
   generated summary is labeled and source-linked. No decision depends on
   generated text.
4. **Approval is mandatory.** `applyChange` is the only writer and requires an
   approving role.

## Options considered

| Option | Why not |
|---|---|
| Build all five capabilities breadth-first | No verifiable loop; the shared-graph claim stays untested. |
| Live-Notion-only from day one | Demo risk; blocks all progress on workspace setup. |
| UI facade on mock data first | Looks good, proves nothing about the graph or write-back. |
| LLM decides the impact | Not testable, not deterministic, and puts generated text in charge of decisions. |

## Rationale

The hardest, least-specified claim is "dependency-aware, human-approved change."
A tracer bullet attacks that claim first and turns the rest of the roadmap into
thickening the same thread. Local-first removes an external dependency from the
critical path while keeping the integration point real.

## Consequences

- Positive: fast, offline-safe, testable, one invariant.
- Negative: Notion sync is not real yet; only one change type.
- Mitigation: the adapter interface and the documented database mapping make the
  real integration a contained follow-up spec.

## References

- [docs/specs/0001-venue-change-impact-engine.md](../specs/0001-venue-change-impact-engine.md)
- [docs/architecture.md](../architecture.md)
- Notion webhooks documentation: https://developers.notion.com/reference/webhooks
