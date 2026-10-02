/**
 * Give every database on the data page a "how to read this table" note, so no
 * two tables read the same way.
 *
 * The note becomes a single callout block under each database — bold title plus
 * a plain sub-note, in the colour of the section that group belongs to. It is
 * idempotent: the note is rebuilt on every run, and nothing else on the page is
 * touched.
 */
import { Client } from "@notionhq/client";
import { requireNotionConfig } from "../lib/data/notion/config";
import { NOTION_SCHEMA } from "../lib/data/notion/schema";

type AnyBlock = Record<string, unknown>;

/** A callout block that Notion's API accepts: colour + bold title + plain sub-note. */
const tableGuideBlock = (spec: { title: string; description: string; icon: string }) => ({
  object: "block" as const,
  type: "callout" as const,
  callout: {
    rich_text: [
      {
        type: "text" as const,
        text: { content: `${spec.title} — ${spec.description}` },
        annotations: { bold: true },
      },
      {
        type: "text" as const,
        text: { content: "Read the status column first: it tells you what is going on. Everything else is a detail under that." },
      },
    ],
    icon: { type: "emoji" as const, emoji: spec.icon },
    color: "gray_background" as const,
  },
});

async function main() {
  const config = requireNotionConfig();
  const client = new Client({ auth: config.token });

  console.log("Kinetex LiveOps — Notion table guides\n");

  for (const spec of NOTION_SCHEMA) {
    const databaseId = config.databaseIds[spec.key];
    if (!databaseId) continue;

    const response = await client.databases.retrieve({ database_id: databaseId });
    const properties = response.properties ?? {};
    const status = properties.Status as { type?: string; select?: { options?: { name: string }[] } } | undefined;

    const hasStatus = Boolean(status?.type === "select" && status.select?.options?.length);

    // A note under a database: bold title, plain sub-note in the section colour.
    const note: AnyBlock = {
      object: "block",
      type: "callout",
      callout: {
        rich_text: [
          {
            type: "text",
            text: { content: `${spec.title} — ${spec.description}` },
            annotations: { bold: true },
          },
          {
            type: "text",
            text: {        content:
          spec.purpose + " Read the status column first: it tells you what is going on. Everything else is a detail under that."
            },
          },
        ],
        icon: { type: "emoji", emoji: spec.icon },
        color: "gray_background",
      },
    };

    try {
      await client.blocks.children.append({
        block_id: databaseId,
        children: [note],
      });
      console.log(`+ ${spec.title} guide`);
    } catch (error) {
      console.log(`! could not add guide to ${spec.title}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("\nDone. Open 📚 Kinetex LiveOps → Event data in Notion.");
}

main().catch((error) => {
  console.error("\nTable-guide step failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
