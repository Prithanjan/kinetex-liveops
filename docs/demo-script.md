# Demo Script

> Discipline rules: every number is measured or labeled a placeholder; never
> claim what the demo did not prove; state the limitations out loud.

## Setup (before you present)

```bash
bun install
bun run dev
# Local seed: curl -X POST http://localhost:3000/api/reset
# Notion:     bun run notion:reset && bun run notion:seed
bun run notion:doctor   # confirm what the integration can see
```

Open `http://localhost:3000`. Keep `docs/user-flow.md` open in a second tab.

## The 90-second run

1. **The problem (10s).** "The auditorium is unusable two hours before the
   event. The hard part is not moving the room. It is everything downstream that
   nobody notices."
2. **The change (10s).** On `/change`, select **Opening Keynote**, new venue
   **Hall B**, reason "roof leak". Click **Preview impact**.
3. **Blast radius (15s).** Point at the affected-record list: sessions, both
   venues, required equipment, assigned people, participant groups, and the
   existing tasks. Say: "It followed the connections, not a keyword list."
4. **Conflicts (20s).** Read the blocking ones: Hall B seats 120 but 240 are
   invited; stage lights, main PA, and the recording kit are not in Hall B.
   Note each conflict cites the records it read.
5. **Proposed follow-ups (15s).** Show owners: organizer resolves capacity;
   logistics moves equipment; communications notifies attendees; volunteers get
   re-briefed; leadership gets a briefing line. "Rules decide the impact. The
   summary only explains it."
6. **Approval (10s).** Uncheck one follow-up to show control. Choose the
   approving role. Click **Approve & apply**.
7. **Closure (10s).** Show the dashboard change log entry and `/roles`: each role
   now sees its owned tasks and deadlines. "This is the record that becomes the
   post-event report."

## Exact numbers to say (measured)

From the seeded reference scenario, printed by the app:

- **13** affected records for the keynote move.
- **4** conflicts: **2** blocking, **1** warning (a third blocking is the
  equipment/availability pair depending on the target), plus info.
- **7** proposed follow-ups spanning all five roles.
- **1** change log entry written on approval.

> Re-run `bun test` and read the API response right before presenting so these
> match your build. If a number changed, say the new number.

## Explicit non-claims (say these, do not let a judge discover them)

- "Notion read and write are real and on demand. It is not a webhook sync, so we
  do not claim instant synchronization for edits made directly in Notion."
- "The generated summary is rules-based, not an LLM call. The label says so."
- "Role views are role-filtered interfaces, not access-controlled."
- "We are not claiming measured operational improvement. These are counts over a
  seeded graph, not field metrics."
- "Notion webhooks can be aggregated or delayed, so we do not claim instant sync
  for edits made directly in Notion."

## Judge Q&A prep

| Question | Answer |
|---|---|
| "Is the graph real or hardcoded?" | Real typed edges by id; traversal is generic. Only the change type is narrow (venue change). |
| "What if AI is wrong?" | It never decides. Rules compute; a person approves before any write. |
| "Why not five features?" | Five capabilities share one graph and one change log. Breadth without the loop is demo theatre. |
| "What is next?" | Real Notion mapping, more change types, volunteer reassignment, post-event report generation. |
| "How long did this take?" | One scaffold pass; state the actual time if known, else say placeholder. |

## Failure drill

If the demo breaks: `curl -X POST http://localhost:3000/api/reset`, reload, and
re-run. The engine is deterministic, so a reset makes the run repeatable.
