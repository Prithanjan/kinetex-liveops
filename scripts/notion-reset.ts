/**
 * Archive every page in the Kinetex LiveOps databases so `notion:seed` can run
 * from a clean workspace. Pages are archived (recoverable in Notion trash), not
 * permanently deleted.
 *
 * Run:  bun run notion:reset
 */
import { Client } from "@notionhq/client";
import { requireNotionConfig } from "../lib/data/notion/config";
import { NOTION_SCHEMA } from "../lib/data/notion/schema";

async function main() {
  const config = requireNotionConfig();
  const client = new Client({ auth: config.token });

  console.log("Kinetex LiveOps — Notion reset (archive all)\n");

  let archived = 0;
  for (const spec of NOTION_SCHEMA) {
    let cursor: string | undefined;
    do {
      const response = await client.databases.query({
        database_id: config.databaseIds[spec.key],
        start_cursor: cursor,
        page_size: 100,
      });
      for (const page of response.results) {
        await client.pages.update({ page_id: page.id, archived: true });
        archived += 1;
      }
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);
    console.log(`= ${spec.title}`);
  }

  console.log(`\nArchived ${archived} page(s). Run: bun run notion:seed`);
}

main().catch((error) => {
  console.error("\nReset failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
