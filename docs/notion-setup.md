# Notion Setup

**Goal:** get a real Notion workspace connected so the Notion source works, with
as little manual work as possible. You create one page. The scripts create the
eight databases, their properties, and the demo data.

> **Do not paste your token into chat.** Put it in `.env.local` yourself (that
> file is gitignored). Then just tell the agent "credentials are set" and it will
> run the scripts and verify. The token never needs to leave your machine.

---

## The four manual steps

### Step 1 — Create the integration

1. Open https://www.notion.so/my-integrations
2. **New integration** → name it `Kinetex LiveOps` → internal → Save.
3. Copy the **Internal Integration Secret** (starts with `secret_`).

### Step 2 — Create one page and share it

1. In Notion, create a normal empty page. Name it `Kinetex LiveOps`.
2. On that page: **⋯ (top right) → Connections → Connect to → Kinetex LiveOps**.
3. Copy the page id: open the page as a full page, and the 32-character hex
   string in the URL is the id. (It looks like
   `https://www.notion.so/Kinetex-LiveOps-<32 hex chars>`.)

This page is the parent. Everything else is created under it.

### Step 3 — Put two values in `.env.local`

```bash
cp .env.example .env.local
```

Then set:

```
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Leave the `NOTION_DB_*` lines empty. The setup script fills them.

### Step 4 — Run the setup, then seed

```bash
bun run notion:setup    # creates the 8 databases, writes their ids to .env.local
bun run notion:seed     # creates the demo event, sessions, equipment, tasks
```

`notion:setup` also sets `KINETEX_SOURCE=notion` in `.env.local`.

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
| `object_not_found` / `Could not find page` | The page is not shared with the integration | Step 2.3: connect the integration on the parent page. |
| `unauthorized` | Bad or missing token | Re-copy the secret in Step 3. |
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
