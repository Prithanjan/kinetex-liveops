# Notion Setup

**Goal:** get a real Notion workspace connected so the Notion source works, with
as little manual work as possible. The only manual step is creating an
integration and copying its token. The scripts create a top level project page,
the eight databases with their properties and relations, and the demo data.

**Verified 2026-10-02:** setup created the page and all eight databases; seed
created 26 pages; reading returned identical domain ids and relations; approving
a change wrote a linked Change Log row, 7 task pages, and updated the session's
Venue relation; the doctor reported 34 records with no missing Domain IDs.

> **Do not paste your token into chat.** Put it in `.env.local` yourself (that
> file is gitignored). Then just tell the agent "credentials are set" and it will
> run the scripts and verify. The token never needs to leave your machine.

---

## The manual steps (about two minutes)

### Step 1 — Create the integration

1. Open https://www.notion.so/my-integrations
2. **New integration** → name it `Kinetex LiveOps` → internal → Save.
3. Copy the **Internal Integration Secret**.

No page needs to be created or shared. The integration can create a top level
page itself, and `notion:setup` does exactly that.

### Step 2 — Put the token in `.env.local`

```bash
cp .env.example .env.local
```

Set only:

```
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Leave `NOTION_PARENT_PAGE_ID` and every `NOTION_DB_*` line empty. The setup
script fills them all.

> Do not paste the token into chat. Keep it in `.env.local`, which is gitignored.

### Step 3 — Run setup, seed, and audit

```bash
bun run notion:setup    # creates a top level "Kinetex LiveOps" page + 8 databases
bun run notion:seed     # creates the demo event, sessions, equipment, tasks
bun run notion:doctor   # verify access, record counts, Domain ID integrity
```

`notion:setup` writes the parent page id and all eight database ids into
`.env.local`, and sets `KINETEX_SOURCE=notion`.

---

## Verify it worked

```bash
bun run dev
```

Then:

- `http://localhost:3000/` shows the event.
- `http://localhost:3000/change` → Preview impact → Approve & apply.
- In Notion, the **Change Log** database now has a new row, the session's
  **Venue** relation changed, and the **Tasks** database has the new follow-ups.

If all three are true, Phase 1 is real and the agent can retire the
"Notion adapter is a placeholder" non-claim.

---

## What each script does

| Script | Command | What it does |
|---|---|---|
| `scripts/notion-setup.ts` | `bun run notion:setup` | Reads `lib/data/notion/schema.ts` and creates every database with the right properties (select options, relations, date fields). Writes ids into `.env.local`. Safe to re-run: existing ids are reused. |
| `scripts/notion-seed.ts` | `bun run notion:seed` | Creates pages from `data/seed/event-graph.json`, in dependency order so relations resolve. Idempotent: pages whose **Domain ID** already exists are skipped. |
| `scripts/notion-reset.ts` | `bun run notion:reset` | Archives every page in the eight databases (recoverable from Notion trash). Use before re-seeding. |

The database definitions come from one file, `lib/data/notion/schema.ts`. The
reader and writer import the same file, so property names cannot drift.

---

## Security notes

- `.env.local` is gitignored. Confirm with `git check-ignore .env.local`.
- The integration only sees pages you explicitly share with it.
- `NOTION_TOKEN` gives full access to everything shared with that integration.
  If it leaks, delete the integration in Notion and make a new one.
- Never commit `.env.local`, screenshots of the token, or its value in a doc.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `object_not_found` / `Could not find page` | A configured page or database id is stale or belongs to a deleted page | Clear the relevant `.env.local` line and re-run `notion:setup`. |
| `unauthorized` | Bad or missing token | Re-copy the secret into `.env.local`. |
| `validation_error: ... property does not exist` | A database was created by hand without a property | Run `bun run notion:reset`, delete the databases, and re-run `notion:setup`. |
| Setup works, seed fails on a relation | Databases exist but were made manually in the wrong order | Let `notion:setup` create all eight. Do not hand-create them. |
| Pages appear but `/` shows nothing | `KINETEX_SOURCE` not set, or the app needs a restart | `notion:setup` sets it; restart `bun run dev`. |

---

## Rolling back to the offline demo

```
KINETEX_SOURCE=local
```

Restart. The seed graph takes over; Notion is ignored. Nothing in the Notion
workspace changes.
