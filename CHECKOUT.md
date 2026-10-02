# Checkout & Verification

Everything you need to look at Kinetex LiveOps yourself, in order. Total time:
about 6 minutes offline, about 10 with Notion.

---

## 0. Prerequisites

| Tool | Version used | Check |
|---|---|---|
| Node | 24.x | `node -v` |
| bun | 1.3.x | `bun -v` |
| git | any | `git -v` |

---

## 1. Install and run offline (about 2 minutes)

```bash
git clone https://github.com/Prithanjan/kinetex-liveops.git
cd kinetex-liveops
bun install
bun run dev
```

Open **http://localhost:3000**.

No credentials needed. The app reads the seeded event graph from
`data/seed/event-graph.json`.

> If a previous run left state behind, reset it:
> `curl -X POST http://localhost:3000/api/reset`

---

## 2. The five minute tour

Follow this order. The whole point is one change going from request to closure.

### 2.1 Dashboard (`/`)

You should see:

- Event status (Kinetex Summit 2026, in planning) and four stat cards.
- **Plan**: the 4 sessions with their venue chips.
- **Open tasks by role**: 4 open tasks, one per role.
- **Change log**: empty on a fresh seed.

### 2.2 Change console (`/change`) — the core loop

1. Leave **Change type** = *Venue change*, session = *Opening Keynote*,
   new venue = *Hall B*.
2. Click **Preview impact**. Nothing has been written yet.
3. Check these four things:
   - **Blast radius** shows ~13 records, each with the `relation` that connected it
     (`required_by_session`, `invited_to_session`, `follows_session`).
   - **Conflicts** are color coded: 2 blocking (capacity exceeded, missing
     equipment) plus warnings and info.
   - **Follow-ups** ~7, each with an owner role and a deadline.
   - The **generated** chip names its generator, which says out loud that it is
     **not an LLM call**, and links its source records.
4. Uncheck one follow-up to prove you have control.
5. Pick an approving role, click **Approve & apply**.
6. Confirm the green banner: change id, records referenced, tasks created.

### 2.3 Dashboard again

The change log now has `chg-001` with a human label, and the new tasks appear in
"Open tasks by role" tagged `from chg-001`.

### 2.4 Role views (`/roles`)

Click through Organizer, Logistics, Volunteer coordinator, Communications,
Leadership. Each sees its own owned/open/blocked counts. These are role-filtered
views, **not** access-controlled.

### 2.5 Report (`/report`)

The approved change appears with its reason, and **Reusable lessons** — one per
conflict category, each linked to the source records that produced it. This is
the "and remembered" step.

### 2.6 Try the other three change types

Back on `/change`, switch the **Change type** selector:

| Type | Try this | Expect |
|---|---|---|
| Time change | Move Opening Keynote to 11:00–12:00 | blocking `schedule_overlap` citing the AI in Practice Panel, plus `person_double_booked`, `attendee_overlap` |
| Person change | Remove V. Lead from Opening Keynote | blocking `unassigned_role`, and follow-ups with **suggested** candidates marked "proposed, not assigned" |
| Resource change | Add *Digital Whiteboard* | blocking `maintenance_window`, plus a `transport_lead_time` warning |

Each previews first, and each writes back only on approval.

---

## 3. Connect real Notion (optional, about 4 minutes)

The integration can create its own workspace structure, so your only input is a
token.

1. Create an internal integration at https://www.notion.so/my-integrations and
   copy the secret.
2. ```bash
   cp .env.example .env.local
   # set NOTION_TOKEN=... and leave everything else blank
   ```
3. ```bash
   bun run notion:all      # setup (page + 8 databases) → present (icon,
                           # cover, template content) → seed (26 pages)
   bun run notion:doctor   # audit access and record counts
   ```
4. Restart `bun run dev` and repeat section 2.2. This time the write-back lands
   in real Notion: a Change Log row linked to the session, the session's fields
   updated, and the follow-up Task pages created.

> Never paste the token into a chat or commit it. `.env.local` is gitignored.
> Full guide: [docs/notion-setup.md](docs/notion-setup.md).

---

## 4. Verify by command

```bash
bunx tsc --noEmit        # types clean
bun test                 # 32 tests: engine, rules, Notion mapping, report
bun run build            # production build, 9 routes
bun run notion:doctor    # Notion integration audit (if configured)
```

API smoke test (with the dev server running):

```bash
curl -s http://localhost:3000/api/graph          # { source, graph }
curl -s http://localhost:3000/api/report         # generated report + lessons
curl -X POST http://localhost:3000/api/change/preview \
  -H 'content-type: application/json' \
  -d '{"changeType":"venue_change","eventId":"evt-1","sessionId":"ses-keynote","newVenueId":"ven-hall-b"}'
```

---

## 5. What "working" looks like

- [ ] Preview shows affected records, conflicts, and role-owned follow-ups.
- [ ] Nothing is written before approval; the apply button is disabled until preview.
- [ ] Approving writes the session change, the tasks, and one linked change log entry.
- [ ] The change log entry names the approving role.
- [ ] Role views show owned/open/blocked per role.
- [ ] The report derives lessons from the recorded conflicts.
- [ ] All four change types preview and apply.
- [ ] On the Notion source, the write-back is visible in the workspace.
- [ ] `bun test`, `tsc --noEmit`, and `bun run build` all pass.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| Dashboard empty | `curl -X POST http://localhost:3000/api/reset`, then reload. |
| Stale state after experiments | Same reset, or delete `data/runtime/graph.json`. |
| `/change` shows "Unknown session" | Reset; the runtime graph references a session the seed no longer has. |
| Notion errors (`object_not_found`, `unauthorized`) | Re-run `bun run notion:setup`; check `NOTION_TOKEN` in `.env.local`. |
| Notion shows an empty report/roles | Expected until you approve a change. |
| Wrong source | `KINETEX_SOURCE` in `.env.local`; `local` or `notion`. Restart dev. |

Reset the Notion demo data:

```bash
bun run notion:reset && bun run notion:seed
```

---

## 7. What this does NOT prove (read before judging)

- **No webhook sync.** Notion read/write is on demand. Edits made directly in
  Notion are not pushed instantly, and Notion documents that some page-update
  events can be aggregated or delayed.
- **Role views are not access-controlled.** They filter by role; there is no auth.
- **The generated summary is rules-based**, not an LLM call. The label says so,
  and the decision path never depends on it.
- **No measured operational improvement.** Counts come from a seeded graph, not
  from field data.
- **Estimates in the plan are estimates**, not measurements.
