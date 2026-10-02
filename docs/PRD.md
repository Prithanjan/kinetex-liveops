# Kinetex LiveOps — Product Requirements Document

> Status: Draft v0.1 · Date: 2026-10-02

## 1. Problem

Event operations live in connected records: events, sessions, venues, equipment,
teams, participants, and tasks. When one thing changes late (a venue, a time, a
resource), the real cost is not the change itself. It is the **downstream work
nobody notices**: equipment that no longer fits, attendees who were never told,
volunteers briefed on the wrong layout, and a decision that is never recorded.

Today that work is found by memory and luck. It is inconsistent, hard to audit,
and impossible to learn from.

## 2. Users

| User | Needs |
|---|---|
| **Organizer** | Understand the full impact of a change before committing to it. |
| **Logistics owner** | Know which equipment and rooms are now in the critical path. |
| **Volunteer coordinator** | Know which shifts and briefings are now stale. |
| **Communications owner** | Know who must be told what, and by when. |
| **Leadership** | See escalation risk and event status without asking. |
| **Post-event author** | Turn approved changes into a report and reusable lessons. |

## 3. Goal

Make one real-world change **caught, understood, acted on, and remembered** in a
single workflow, on a single dependency graph, with a human approving every write.

## 4. The workflow (one change-to-closure path)

1. **Plan** — event records form a connected graph.
2. **Detect dependencies** — traversal from the changed record.
3. **Preview impact** — conflicts and missing follow-ups, before any write.
4. **Assign follow-ups** — role-owned tasks with deadlines.
5. **Approve and sync** — a person approves; records update; a linked change log is written.
6. **Brief each role** — role-filtered tasks, blockers, deadlines.
7. **Capture lessons** — the change log feeds a structured report.

## 5. Scope of this MVP

**In scope (built):**

- One change type: **venue change**, end to end.
- Deterministic dependency traversal over the seeded event graph.
- Six conflict rules (capacity, missing equipment, unavailable equipment,
  schedule overlap, communication gap, coverage gap).
- Role-owned follow-up proposals with deadlines.
- Approval API that writes the moved session, the tasks, and a linked change log.
- Three screens: dashboard, change console, role views.
- Labeled, source-linked generated summary (rules-based).
- Local source (offline) and a Notion adapter interface.

**Out of scope (deferred):**

- Generalized schedule simulation.
- Automatic skill-based volunteer reassignment.
- Broad AI risk detection.
- Webhook-based sync (Notion webhooks can be aggregated or delayed).
- Access control on role views.
- Live Notion read/write mapping (adapter is a placeholder).

## 6. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | The system reads the event graph from a selectable source. |
| FR-2 | A venue-change request returns the affected records and the relation for each. |
| FR-3 | The system detects conflicts with an explicit severity and cites the records it read. |
| FR-4 | The system proposes follow-up tasks owned by a role, each with a deadline. |
| FR-5 | The system produces a generated summary labeled as generated, naming its generator and linking source records. |
| FR-6 | No write occurs without an approval that names the approving role. |
| FR-7 | An approved change writes: the moved session, the follow-up tasks, and one linked change log entry. |
| FR-8 | Role views filter tasks by role and show owned, open, and blocked counts. |
| FR-9 | The demo can be reset to the seed state. |

## 7. Acceptance criteria

- **AC-1** Changing `ses-keynote` to `ven-hall-b` reports 13 affected records across sessions, venues, equipment, people, groups, and tasks.
- **AC-2** The same change reports at least two blocking conflicts (capacity exceeded, missing equipment) and cites record ids for every conflict.
- **AC-3** Proposed follow-ups span organizer, logistics, communications, volunteer coordinator, and leadership.
- **AC-4** The summary's `generator` string states it is not an LLM call; `generated` is `true`; `sourceRecordIds` is non-empty.
- **AC-5** Applying the change moves the session, creates the selected tasks, and appends one change log entry naming the approving role.
- **AC-6** `bun test`, `bun run typecheck`, and `bun run build` all pass.
- **AC-7** A clean graph with enough capacity and equipment produces zero blocking conflicts.

## 8. Non-functional requirements

- **Determinism:** identical input graph and change produce identical reports.
- **Offline-safe:** the demo needs no credentials or network.
- **Clarity:** every generated statement is separable from source facts.
- **Resetability:** the demo replays from a known state.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Scope creep across five capabilities | One change type, end to end, first. |
| Notion mapping unknown | Adapter interface + offline seed; mapping documented but deferred. |
| Demo depends on Notion being live | Demo runs local; Notion is an env switch. |
| Losing the "one workflow" story | Every capability reads the same graph and change log. |

## 10. Metrics

> Placeholder. No operational metrics are measured yet. Counts shown in the demo
> are counts over the seed graph, not field measurements.
