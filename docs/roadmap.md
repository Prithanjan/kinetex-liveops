# Roadmap

Ordered by value per effort. Phase 1 is done (the tracer bullet).

## Phase 1 — Foundation (done)

- Event graph + source adapters.
- Venue-change impact engine.
- Approval + write-back.
- Command-center UI.
- Role views.

## Phase 2 — Integration (next)

1. **Real Notion mapping.** Implement `notion-source.readGraph`/`writeGraph`
   against `docs/data-model.md`. This is the highest-value next step because it
   converts the biggest placeholder into a real capability.
2. **Post-event report + lesson compiler.** Turn the change log into a labeled
   post-event section. Data already exists; this is presentation + synthesis.

## Phase 3 — Breadth

3. **More change types.** Time change, resource change, person change. Each
   reuses the same graph and change log; each adds rules and follow-up mappings.
4. **Volunteer reassignment.** Skill-based reassignment of uncovered shifts
   (needs `Person.skills` and shift-level assignment, both already modeled).
5. **Notion webhook sync.** React to Notion edits. Treat as stretch: Notion
   documents webhooks, but page-update events can be aggregated or delayed.

## Deliberately not built

- Access control between role views.
- Broad AI risk detection outside the graph edges.
- Any claim of measured operational improvement.
- Any claim of instant Notion synchronization.
