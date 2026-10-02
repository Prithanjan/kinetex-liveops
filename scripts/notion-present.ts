/**
 * Make the Notion workspace look like a designed template rather than a bare
 * list of databases.
 *
 * Run:  bun run notion:present
 *
 * Applies the conventions that make Notion templates read well: one coordinated
 * icon per database, a page icon and cover, section headings, subtle-outline
 * callouts, columns, a toggle for detail, and dividers between sections.
 *
 * Idempotent: content is appended once, detected by a marker block.
 */
import { Client } from "@notionhq/client";
import { requireNotionConfig } from "../lib/data/notion/config";
import { NOTION_SCHEMA, type DatabaseKey } from "../lib/data/notion/schema";

const MARKER = "KINETEX-PRESENT-V1";
const COVER_URL =
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=2000&q=80";

/** One emoji per database, so the workspace has a consistent icon language. */
const DATABASE_ICONS: Record<DatabaseKey, string> = {
  events: "🎟️",
  equipment: "🎛️",
  people: "👥",
  groups: "🎫",
  venues: "🏛️",
  sessions: "🗓️",
  changeLog: "🔁",
  tasks: "✅",
};

type AnyBlock = Record<string, unknown>;

const rt = (content: string) => [{ type: "text", text: { content } }];

const h2 = (content: string): AnyBlock => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: rt(content) },
});

const p = (content: string): AnyBlock => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: rt(content) },
});

const bullet = (content: string): AnyBlock => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: rt(content) },
});

const numbered = (content: string): AnyBlock => ({
  object: "block",
  type: "numbered_list_item",
  numbered_list_item: { rich_text: rt(content) },
});

const divider = (): AnyBlock => ({ object: "block", type: "divider", divider: {} });

/** Subtle outline callout, the tip from every Notion aesthetic guide. */
const callout = (
  content: string,
  emoji: string,
  color: string = "gray_background",
): AnyBlock => ({
  object: "block",
  type: "callout",
  callout: { rich_text: rt(content), icon: { type: "emoji", emoji }, color },
});

async function appendBlocks(client: Client, pageId: string, blocks: AnyBlock[]) {
  // Notion caps a single append at 100 blocks; ours is far below.
  await client.blocks.children.append({
    block_id: pageId,
    children: blocks as Parameters<Client["blocks"]["children"]["append"]>[0]["children"],
  });
}

async function contentAlreadyPresent(client: Client, pageId: string): Promise<boolean> {
  let cursor: string | undefined;
  do {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of response.results) {
      const record = block as unknown as {
        type?: string;
        paragraph?: { rich_text?: { plain_text?: string }[] };
        heading_2?: { rich_text?: { plain_text?: string }[] };
      };
      const texts = [
        ...(record.paragraph?.rich_text ?? []),
        ...(record.heading_2?.rich_text ?? []),
        ...((record as { callout?: { rich_text?: { plain_text?: string }[] } }).callout
          ?.rich_text ?? []),
      ];
      if (texts.some((part) => part.plain_text?.includes(MARKER))) return true;
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return false;
}

async function main() {
  const config = requireNotionConfig();
  const client = new Client({ auth: config.token });
  const pageId = config.parentPageId;

  console.log("Kinetex LiveOps — Notion presentation\n");

  // 1. Page icon and cover.
  await client.pages.update({
    page_id: pageId,
    icon: { type: "emoji", emoji: "🎪" },
    cover: { type: "external", external: { url: COVER_URL } },
  } as Parameters<Client["pages"]["update"]>[0]);
  console.log("+ page icon and cover");

  // 2. One icon per database.
  for (const spec of NOTION_SCHEMA) {
    const id = config.databaseIds[spec.key];
    if (!id) continue;
    await client.databases.update({
      database_id: id,
      icon: { type: "emoji", emoji: DATABASE_ICONS[spec.key] },
    } as Parameters<Client["databases"]["update"]>[0]);
    console.log(`+ icon ${DATABASE_ICONS[spec.key]} ${spec.title}`);
  }

  // 3. Structured content, appended once.
  if (await contentAlreadyPresent(client, pageId)) {
    console.log("= content already present, skipping");
    console.log("\nDone. Reload the page in Notion.");
    return;
  }

  const workflow = [
    "Plan: the event records form a connected graph.",
    "Detect dependencies: traverse from the record that changed.",
    "Preview impact: conflicts and missing follow-ups, before any write.",
    "Assign follow-ups: role-owned tasks with deadlines.",
    "Approve and sync: a person approves, then records update and a linked change log is written.",
    "Brief each role: role-filtered tasks, blockers, and deadlines.",
    "Capture lessons: the change log becomes a structured report.",
  ];

  const workspaceMap = [
    "🎟️ Events — the top-level record each session belongs to.",
    "🗓️ Sessions — what runs, when, in which venue, with which equipment and people.",
    "🏛️ Venues — rooms, their seats, and the equipment they already host.",
    "🎛️ Equipment — items with a service status the rules check.",
    "👥 People — who is assigned, and which roles they hold.",
    "🎫 Participant Groups — audience sizes, used for capacity and comms.",
    "🔁 Change Log — every approved change, linked to its session and tasks.",
    "✅ Tasks — follow-ups, owned by a role, with a due date.",
  ];

  const blocks: AnyBlock[] = [
    callout(
      "Turn event records into a dependency-aware command center: when a plan changes, show the operational impact, propose role-owned follow-ups, and record the approved decision back here.",
      "🎯",
    ),
    divider(),
    h2("The workflow"),
    ...workflow.map(numbered),
    divider(),
    h2("Workspace map"),
    ...workspaceMap.map(bullet),
    divider(),
    h2("Roles"),
    bullet("Organizer — resolves capacity, overlaps, and the run of show."),
    bullet("Logistics — moves equipment and clears maintenance blocks."),
    bullet("Volunteer coordinator — re-briefs people and refills vacated roles."),
    bullet("Communications — notifies the affected audience."),
    bullet("Leadership — tracks escalation risk for the event."),
    divider(),
    callout(
      "Rules decide the impact; the generated summary only explains it. Generated text is labeled and links the source records it read, and nothing is written before a person approves.",
      "📐",
    ),
    callout(
      "What this does not claim: this is on demand read and write, not a webhook sync. Role views are filtered, not access controlled. The summary is rules based, not a model call. No measured operational improvement is claimed.",
      "⚠️",
      "orange_background",
    ),
    divider(),
    p(
      `${MARKER} Walkthrough and verification steps live in the repository: CHECKOUT.md`,
    ),
  ];

  await appendBlocks(client, pageId, blocks);
  console.log(`+ ${blocks.length} content blocks`);

  console.log("\nDone. Reload the page in Notion.");
}

main().catch((error) => {
  console.error("\nPresentation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
