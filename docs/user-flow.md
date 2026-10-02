# User Flow

The whole product is one path: **a change goes from request to closure.**

## 1. Flow diagram

```
Organizer
   │  notices a problem ("roof leak, auditorium is unusable")
   ▼
/change  ── select session + new venue + reason ──► [Preview impact]
   │
   ▼
System: traverse graph, run rules, propose follow-ups
   │
   ▼
Impact preview  ── shows:
   │   • blast radius (affected records + relation)
   │   • conflicts (blocking / warning / info)
   │   • proposed follow-ups with owner + deadline
   │   • generated summary (labeled, source-linked)
   │
   ├── Organizer disagrees?  ──► change inputs, preview again (nothing written)
   │
   ▼  Organizer ticks the follow-ups to keep, picks approving role
[Approve & apply]
   │
   ▼
System: writes session move + tasks + linked change log entry
   │
   ▼
/  dashboard ── event status, open tasks by role, change log
/roles       ── each role sees its owned tasks, open count, blockers
   │
   ▼
Change log entry ──► post-event report + reusable lessons
```

## 2. Step by step

| # | Actor | Action | System | Screen |
|---|---|---|---|---|
| 1 | Organizer | Opens the command center | Reads the event graph from the selected source | `/` |
| 2 | Organizer | Picks a session and a new venue, gives a reason | — | `/change` |
| 3 | Organizer | Clicks **Preview impact** | `computeImpact` traverses edges, runs conflict rules, plans follow-ups, builds summary | `/change` |
| 4 | Organizer | Reviews blast radius and conflicts | Lists every affected record with its relation; each conflict cites its records | `/change` |
| 5 | Organizer | Unchecks follow-ups they do not want | — | `/change` |
| 6 | Organizer | Picks approving role and clicks **Approve & apply** | `applyChange` writes the move, tasks, and change log entry | `/change` |
| 7 | Each role | Opens their briefing | Filters the same approved records by role | `/roles` |
| 8 | Leadership | Reviews status and escalation risk | Shows owned, open, and blocked counts | `/roles` |
| 9 | Post-event author | Reads the change log | Summary + follow-up task ids + affected records are persisted | `/` |

## 3. What each role sees

| Role | Owned work in the reference scenario |
|---|---|
| Organizer | Resolve capacity; clear the double booking; update run of show and signage |
| Logistics | Move required equipment into the new venue; resolve unavailable equipment |
| Volunteer coordinator | Re-brief volunteers; assign a logistics owner |
| Communications | Notify attendees that the session moved |
| Leadership | Add the venue change to the leadership briefing |

## 4. States

- **No report yet** — the apply button is disabled. Preview is required first.
- **Report shown, nothing applied** — the graph is unchanged. Preview is read-only.
- **Approved** — a confirmation banner shows the change id, affected count, and
  task count; the dashboard and role views update.
- **Reset** — `POST /api/reset` returns the graph to the seed for a clean replay.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Unknown session or venue | 422 with the failing id; nothing written. |
| Malformed request body | 400 with the expected shape. |
| Missing approving role | 400 listing valid roles. |
| No conflicts detected | Preview still shows follow-ups (the always-on coordination steps). |
| Change applied twice | A second change gets the next `chg-NNN`; earlier tasks remain. |
| Notion source selected, unconfigured | Adapter throws the missing env vars; nothing faked. |
| Notion source selected, configured | Adapter throws "placeholder, not implemented"; nothing faked. |

## 6. Non-goals of this flow

- No automatic reassignment of volunteers.
- No simulated schedule search.
- No access control between role views.
- No instant Notion sync of edits made directly in Notion.
