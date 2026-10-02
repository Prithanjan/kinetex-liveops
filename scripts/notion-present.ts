/**
 * Make the Notion workspace feel like a designed template rather than a bare
 * list of databases.
 *
 * Run:  bun run notion:present
 *
 * Two pages, two jobs:
 *
 *   1. A home page ("🏠 Kinetex LiveOps") — the thing a person opens first.
 *      Cover, icon, a plain-language intro, the seven steps as illustrated
 *      cards, who each role serves, and an honest note about what the writing
 *      does and does not claim.
 *   2. The data page (the page the databases live on, renamed "📚 Event data")
 *      — a caption under every database, in section groups, so the list reads
 *      as a designed index instead of eight identical rows.
 *
 * Idempotent by construction: presented blocks are removed and rebuilt on every
 * run. The databases themselves are never touched, and no marker text is ever
 * written into the page.
 */
import { Client } from "@notionhq/client";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { requireNotionConfig } from "../lib/data/notion/config";
import { NOTION_SCHEMA, type DatabaseSpec } from "../lib/data/notion/schema";

const ENV_PATH = ".env.local";
const HOME_TITLE = "Kinetex LiveOps";
const DATA_TITLE = "Event data";

const HOME_COVER =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=80";
const DATA_COVER =
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=2000&q=80";

type AnyBlock = Record<string, unknown>;

type CreatePageArgs = Parameters<Client["pages"]["create"]>[0];
type UpdatePageArgs = Parameters<Client["pages"]["update"]>[0];
type AppendArgs = Parameters<Client["blocks"]["children"]["append"]>[0];

// ── tiny block builders ────────────────────────────────────────────────────

const rich = (content: string, bold = false) =>
  bold
    ? [{ type: "text", text: { content }, annotations: { bold: true } }]
    : [{ type: "text", text: { content } }];

const paragraph = (content: string): AnyBlock => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: rich(content) },
});

const h2 = (content: string): AnyBlock => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: rich(content) },
});

const h3 = (content: string): AnyBlock => ({
  object: "block",
  type: "heading_3",
  heading_3: { rich_text: rich(content) },
});

const bullet = (content: string): AnyBlock => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: rich(content) },
});

const divider = (): AnyBlock => ({ object: "block", type: "divider", divider: {} });

const quote = (content: string): AnyBlock => ({
  object: "block",
  type: "quote",
  quote: { rich_text: rich(content) },
});

const callout = (
  content: string,
  emoji: string,
  color = "gray_background",
  bold = false,
): AnyBlock => {
  // Style the title so it reads like a card header and the rest like a note.
  const parts = content.split("\n");
  return {
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji },
      color,
      rich_text: [
        ...parts.map((line, index) => ({
          type: "text",
          text: { content: line },
          annotations: { bold: index === 0 && bold },
        })),
      ],
    },
  };
};

/** A step card: an emoji, a name, and one plain sentence under it. */
const stepCard = (
  emoji: string,
  name: string,
  line: string,
  color = "orange_background",
): AnyBlock => {
  const parts = [`${name} — ${line}`];
  return {
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji },
      color,
      rich_text: [
        {
          type: "text",
          text: { content: parts[0] },
          annotations: { bold: true },
        },
      ],
    },
  };
};

const linkToPage = (pageId: string): AnyBlock => ({
  object: "block",
  type: "link_to_page",
  link_to_page: { type: "page_id", page_id: pageId },
});

const column = (children: AnyBlock[]): AnyBlock => ({
  object: "block",
  type: "column",
  column: { children },
});

const columns = (cols: AnyBlock[]): AnyBlock => ({
  object: "block",
  type: "column_list",
  column_list: { children: cols },
});

// ── Notion plumbing ────────────────────────────────────────────────────────

async function append(client: Client, blockId: string, blocks: AnyBlock[], after?: string) {
  if (blocks.length === 0) return [];
  const body: AppendArgs = {
    block_id: blockId,
    children: blocks as NonNullable<AppendArgs["children"]>,
  };
  if (after) body.after = after;
  const response = await client.blocks.children.append(body);
  return (response.results ?? []).map((block) => (block as { id: string }).id);
}

/** Every child block, following pagination. */
async function children(client: Client, blockId: string): Promise<AnyBlock[]> {
  const all: AnyBlock[] = [];
  let cursor: string | undefined;
  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of response.results) all.push(block as AnyBlock);
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return all;
}

/**
 * Remove the blocks this script owns, so a re-run produces exactly one clean
 * version of the design instead of layering a second one on top.
 *
 * Databases and child pages are skipped: deleting a `child_page` would archive
 * a real page, and deleting a `child_database` would archive a real database.
 */
async function clearPresented(client: Client, pageId: string) {
  const blocks = await children(client, pageId);
  let removed = 0;
  for (const block of blocks) {
    const type = block.type as string;
    if (type === "child_database" || type === "child_page" || type === "unsupported") {
      continue;
    }
    await client.blocks.delete({ block_id: block.id as string });
    removed += 1;
  }
  return removed;
}

async function childDatabases(client: Client, pageId: string) {
  const blocks = await children(client, pageId);
  return blocks
    .filter((block) => block.type === "child_database")
    .map((block) => ({
      id: block.id as string,
      title: ((block as { child_database?: { title?: string } }).child_database
        ?.title ?? "") as string,
    }));
}

function specForTitle(title: string): DatabaseSpec | undefined {
  return NOTION_SCHEMA.find(
    (spec) => spec.title.toLowerCase() === title.trim().toLowerCase(),
  );
}

function setEnvValue(contents: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(contents)) return contents.replace(pattern, line);
  const separator = contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";
  return `${contents}${separator}${line}\n`;
}

/** Create the home page once, then remember it in .env.local. */
async function ensureHomePage(client: Client): Promise<{ pageId: string; created: boolean }> {
  const configured = process.env.NOTION_HOME_PAGE_ID;
  if (configured) return { pageId: configured, created: false };

  const page = await client.pages.create({
    parent: { type: "workspace", workspace: true },
    icon: { type: "emoji", emoji: "🏠" },
    properties: {
      title: { title: [{ type: "text", text: { content: HOME_TITLE } }] },
    },
  } as unknown as CreatePageArgs);

  const env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  writeFileSync(ENV_PATH, setEnvValue(env, "NOTION_HOME_PAGE_ID", page.id), "utf8");
  return { pageId: page.id, created: true };
}

async function titleOf(client: Client, pageId: string): Promise<string> {
  const page = await client.pages.retrieve({ page_id: pageId });
  const title = (page as { properties?: Record<string, unknown> }).properties?.title as
    | { title?: { plain_text?: string }[] }
    | undefined;
  return title?.title?.map((part) => part.plain_text ?? "").join("") ?? "";
}

async function rename(client: Client, pageId: string, name: string) {
  if ((await titleOf(client, pageId)) === name) return false;
  await client.pages.update({
    page_id: pageId,
    properties: { title: { title: [{ type: "text", text: { content: name } }] } },
  } as unknown as UpdatePageArgs);
  return true;
}

async function decorate(
  client: Client,
  pageId: string,
  emoji: string,
  cover: string,
) {
  await client.pages.update({
    page_id: pageId,
    icon: { type: "emoji", emoji },
    cover: { type: "external", external: { url: cover } },
  } as unknown as UpdatePageArgs);
}

// ── the home page ──────────────────────────────────────────────────────────

function homeBlocks(dataPageId: string): AnyBlock[] {
  return [
    callout(
      "This is where an event is run from. When a plan changes, Kinetex LiveOps shows what the change touches, proposes the follow-ups it creates, and — only after a person approves — writes the decision back into Notion.",
      "🎯",
      "orange_background",
      true,
    ),

    columns([
      column([
        h3("Open the workspace"),
        linkToPage(dataPageId),
        paragraph(
          "Eight connected databases: the event, the rooms and kit, the people, the timetable, and the change log that follows from them.",
        ),
      ]),
      column([
        h3("What makes it useful"),
        bullet("It follows connections, not checklists — move one session and it finds the kit, crew, and audience that move with it."),
        bullet("Nothing is written until a person approves it."),
        bullet("Every change leaves a trail you can learn from later."),
      ]),
    ]),

    divider(),
    h2("The loop it runs"),
    paragraph(
      "One path, from a plan changing to a lesson recorded. Everything below happens in that order.",
    ),
    stepCard("🧭", "1 · Plan", "The event's records are already connected, so the software can follow the threads.", "brown_background"),
    stepCard("🔎", "2 · Detect", "Start from the record that changed and walk outward through everything that depends on it.", "yellow_background"),
    stepCard("🧮", "3 · Preview", "See the conflicts and the missing follow-ups before a single record is touched.", "blue_background"),
    stepCard("👤", "4 · Assign", "Each follow-up goes to the role that owns it, with a deadline and a proposed person.", "purple_background"),
    stepCard("✅", "5 · Approve", "A person approves. Then the session updates and a linked change log entry is written.", "green_background"),
    stepCard("📣", "6 · Brief", "Every role opens the work that is theirs, with the blockers that need escalating on top.", "pink_background"),
    stepCard("📓", "7 · Learn", "The change log becomes a structured post-event report and a set of reusable lessons.", "gray_background"),

    divider(),
    h2("Who this is for"),
    paragraph("Five roles work from the same approved facts, each seeing their own part of it."),
    columns([
      column([
        callout("Organizer — resolves capacity, overlaps, and the run of show.", "🧭", "brown_background", true),
        callout("Logistics — moves equipment and clears maintenance blocks.", "📦", "blue_background", true),
        callout("Volunteer coordinator — re-briefs people and refills vacated roles.", "🤝", "green_background", true),
      ]),
      column([
        callout("Communications — notifies the audience that is affected.", "📣", "pink_background", true),
        callout("Leadership — tracks escalation risk across the whole event.", "🧭", "purple_background", true),
        paragraph("Each role opens a filtered view of the same approved facts — no separate copy to keep in sync."),
      ]),
    ]),

    divider(),
    h2("How the writing works"),
    callout(
      "Rules decide the impact. The summary only explains it. Generated text is labelled and links the records it read, and a human approves before anything is written.",
      "📐",
      "gray_background",
    ),
    callout(
      "It is also honest about its edges: this is on-demand read and write, not a webhook sync. Role views are filtered, not access-controlled. The summary is rules-based, not a model call. No measured operational improvement is claimed.",
      "⚠️",
      "yellow_background",
    ),
    quote(
      "Walkthrough and verification steps live in the repository: CHECKOUT.md at github.com/Prithanjan/kinetex-liveops.",
    ),
  ];
}

// ── the data page ──────────────────────────────────────────────────────────

/**
 * The note under a database: what it is, what it is for, and how to read this
 * particular table. Two rich-text runs so the header reads bold and the guide
 * reads as a sub-note underneath it.
 */
function captionCallout(spec: DatabaseSpec, color: string): AnyBlock {
  // The caption reads like a real template card: the name as a header, the
  // purpose as the first line, and a separate reading guide as a note.
  return {
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji: spec.icon },
      color,
      rich_text: [
        { type: "text", text: { content: spec.title }, annotations: { bold: true } },
        { type: "text", text: { content: `  ${spec.purpose}` } },
        { type: "text", text: { content: `  ${spec.readGuide}` } },
      ],
    },
  };
}

function sectionHeading(title: string, blurb: string, color: string): AnyBlock[] {
  return [divider(), h3(title), callout(blurb, "🧩", color)];
}

/** Soft background colour per section, so groups read apart at a glance. */
const SECTION_BACKGROUND: Record<string, string> = {
  "The event": "orange_background",
  "The moving parts": "blue_background",
  "The run of show": "green_background",
  "Change & follow-through": "red_background",
};

/**
 * Walk the page's databases in the order they appear and drop a caption plus
 * section marker between them. Inserted with `after`, so nothing is ever lost.
 */
async function presentDataPage(client: Client, pageId: string, homePageId: string) {
  const removed = await clearPresented(client, pageId);
  if (removed > 0) console.log(`  · cleared ${removed} old block(s)`);

  const databases = await childDatabases(client, pageId);
  if (databases.length === 0) {
    console.log("  ! no databases found on the page — run notion:setup first");
    return;
  }

  const resolved = databases
    .map((entry) => ({ entry, spec: specForTitle(entry.title) }))
    .filter((row): row is { entry: (typeof databases)[number]; spec: DatabaseSpec } =>
      Boolean(row.spec),
    );

  for (let index = 0; index < resolved.length; index += 1) {
    const { entry, spec } = resolved[index];
    const color = SECTION_BACKGROUND[spec.section.title] ?? "gray_background";

    // One append per database, anchored to the database block itself. Notion
    // only honours `after` reliably for these anchors, so the caption for this
    // database and the marker for the *next* section travel together.
    const blocks: AnyBlock[] = [captionCallout(spec, color)];
    const next = resolved[index + 1]?.spec;
    if (next && next.section.title !== spec.section.title) {
      const nextColor = SECTION_BACKGROUND[next.section.title] ?? "gray_background";
      blocks.push(...sectionHeading(next.section.title, next.section.blurb, nextColor));
    }

    await append(client, pageId, blocks, entry.id);
    console.log(`  + ${spec.icon} ${spec.title}`);
  }

  // A way back, and one line about what the page is.
  await append(client, pageId, [
    divider(),
    callout(
      "Everything on this page is read and written by Kinetex LiveOps. The Domain ID property on each row is how the software finds a record again without guessing from the title.",
      "🔗",
      "gray_background",
    ),
    paragraph("Back to the command centre:"),
    linkToPage(homePageId),
  ]);
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const config = requireNotionConfig();
  const client = new Client({ auth: config.token });

  console.log("Kinetex LiveOps — Notion presentation\n");

  const home = await ensureHomePage(client);
  console.log(
    `${home.created ? "+ created" : "="} home page "🏠 ${HOME_TITLE}" (${home.pageId})`,
  );

  const renamed = await rename(client, config.parentPageId, DATA_TITLE);
  console.log(
    `${renamed ? "+ renamed" : "="} data page to "📚 ${DATA_TITLE}"`,
  );

  await decorate(client, home.pageId, "🏠", HOME_COVER);
  await decorate(client, config.parentPageId, "📚", DATA_COVER);
  console.log("+ icons and covers");

  console.log("\nData page:");
  await presentDataPage(client, config.parentPageId, home.pageId);

  console.log("\nHome page:");
  const cleared = await clearPresented(client, home.pageId);
  if (cleared > 0) console.log(`  · cleared ${cleared} old block(s)`);
  const blocks = homeBlocks(config.parentPageId);
  await append(client, home.pageId, blocks);
  console.log(`  + ${blocks.length} blocks`);

  console.log(
    `\nDone. Open 🏠 ${HOME_TITLE} in Notion — that is the page to start from.`,
  );
}

main().catch((error) => {
  console.error("\nPresentation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
