/**
 * Diagnostic and audit for the Kinetex LiveOps Notion integration.
 *
 * Run:  bun run notion:doctor
 *
 * Reports, without ever printing the token:
 *   - whether the token works
 *   - which pages and databases the integration can actually see
 *   - whether the configured databases exist
 *   - how many records are in each, and whether any are missing a Domain ID
 */
import { Client } from "@notionhq/client";
import { DOMAIN_ID_PROPERTY, NOTION_SCHEMA } from "../lib/data/notion/schema";

interface ParentLike {
  type: string;
  page_id?: string;
  database_id?: string;
}

interface SearchItem {
  object: string;
  id: string;
  parent?: ParentLike;
  title?: { plain_text?: string }[];
  properties?: Record<string, { type?: string; title?: { plain_text?: string }[] }>;
}

function parentIdOf(item: SearchItem): string {
  const parent = item.parent;
  if (!parent) return "unknown";
  if (parent.type === "page_id") return parent.page_id ?? "?";
  if (parent.type === "database_id") return parent.database_id ?? "?";
  return parent.type;
}

function titleOf(item: SearchItem): string {
  if (item.title && item.title.length > 0) {
    return item.title.map((part) => part.plain_text ?? "").join("");
  }
  if (item.properties) {
    for (const value of Object.values(item.properties)) {
      if (value.type === "title" && value.title) {
        return value.title.map((part) => part.plain_text ?? "").join("");
      }
    }
  }
  return "(untitled)";
}

async function main() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    console.error("NOTION_TOKEN is not set in .env.local.");
    process.exit(1);
  }

  const client = new Client({ auth: token });
  console.log("Kinetex LiveOps — Notion doctor\n");

  // 1. Can we reach the API at all?
  const me = await client.users.me({});
  const botName = "name" in me && me.name ? me.name : me.id;
  console.log(`Token: OK (integration: ${botName}, type: ${me.type})`);

  // 2. What can the integration see?
  const search = await client.search({ page_size: 100 });
  const items = search.results as unknown as SearchItem[];
  const pages = items.filter((item) => item.object === "page");
  const databases = items.filter((item) => item.object === "database");

  console.log(
    `\nVisible to the integration: ${pages.length} page(s), ${databases.length} database(s)`,
  );

  for (const page of pages.slice(0, 20)) {
    console.log(
      `  page     ${page.id}  ${titleOf(page)}  (parent: ${page.parent?.type ?? "?"} ${parentIdOf(page)})`,
    );
  }
  for (const database of databases.slice(0, 20)) {
    const propertyNames = database.properties
      ? Object.keys(database.properties).join(", ")
      : "";
    console.log(
      `  database ${database.id}  ${titleOf(database)}  (parent: ${database.parent?.type ?? "?"} ${parentIdOf(database)})`,
    );
    console.log(`           properties: ${propertyNames}`);
  }

  if (pages.length === 0 && databases.length === 0) {
    console.log(
      "\nNothing is shared with this integration yet. Create one page in Notion, " +
        "open it, then ⋯ → Connections → Connect to your integration.",
    );
    return;
  }

  // 3. Are the configured databases present and populated?
  const configured = NOTION_SCHEMA.filter((spec) => process.env[spec.envVar]);
  if (configured.length === 0) {
    console.log(
      "\nNo NOTION_DB_* ids configured yet. Run `bun run notion:setup`.",
    );
    return;
  }

  console.log("\nConfigured databases:");
  let totalRecords = 0;
  let missingDomainId = 0;

  for (const spec of NOTION_SCHEMA) {
    const databaseId = process.env[spec.envVar];
    if (!databaseId) {
      console.log(`  ${spec.title.padEnd(18)} (not configured)`);
      continue;
    }
    try {
      let cursor: string | undefined;
      let count = 0;
      let missing = 0;
      do {
        const response = await client.databases.query({
          database_id: databaseId,
          start_cursor: cursor,
          page_size: 100,
        });
        for (const page of response.results) {
          if (!("properties" in page)) continue;
          count += 1;
          const prop = page.properties[DOMAIN_ID_PROPERTY];
          const text =
            prop && prop.type === "rich_text"
              ? prop.rich_text.map((part) => part.plain_text).join("")
              : "";
          if (!text) missing += 1;
        }
        cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
      } while (cursor);
      totalRecords += count;
      missingDomainId += missing;
      console.log(
        `  ${spec.title.padEnd(18)} ${String(count).padStart(3)} record(s)` +
          (missing > 0 ? `  ⚠ ${missing} missing Domain ID` : ""),
      );
    } catch (error) {
      console.log(
        `  ${spec.title.padEnd(18)} ERROR: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`\nTotal records: ${totalRecords}`);
  if (missingDomainId > 0) {
    console.log(
      `${missingDomainId} record(s) have no Domain ID, so write-back cannot address them. ` +
        `Run \`bun run notion:reset\` then \`bun run notion:seed\`.`,
    );
  }
  console.log("Doctor finished.");
}

main().catch((error) => {
  console.error("\nDoctor failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
