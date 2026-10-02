/**
 * Create (or upgrade) the Kinetex LiveOps databases in Notion, then write their
 * ids into .env.local.
 *
 * Only prerequisite: NOTION_TOKEN in .env.local. If NOTION_PARENT_PAGE_ID is
 * empty, this creates a top level "Kinetex LiveOps" page and uses it as the
 * parent. Everything else is automated.
 *
 * Run:  bun run notion:setup
 *
 * Safe to re-run, and safe after a schema change: existing databases are reused
 * and any property or select option declared in the schema but missing in
 * Notion is added. Nothing is ever removed.
 */
import { Client } from "@notionhq/client";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  NOTION_SCHEMA,
  databaseSpec,
  type DatabaseKey,
  type PropertySpec,
} from "../lib/data/notion/schema";

const ENV_PATH = ".env.local";
const PARENT_PAGE_TITLE = "Kinetex LiveOps";

type CreateDatabaseArgs = Parameters<Client["databases"]["create"]>[0];
type UpdateDatabaseArgs = Parameters<Client["databases"]["update"]>[0];
type CreatePageArgs = Parameters<Client["pages"]["create"]>[0];

function asProperties(value: Record<string, unknown>): CreateDatabaseArgs["properties"] {
  return value as unknown as CreateDatabaseArgs["properties"];
}

function readEnvFile(): string {
  return existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
}

function setEnvValue(contents: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(contents)) return contents.replace(pattern, line);
  const separator = contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";
  return `${contents}${separator}${line}\n`;
}

function requireToken(): string {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    console.error("\nMissing NOTION_TOKEN in .env.local.");
    console.error(
      "Create an internal integration at https://www.notion.so/my-integrations, " +
        "then set NOTION_TOKEN. See docs/notion-setup.md.\n",
    );
    process.exit(1);
  }
  return token;
}

/** Build the Notion property config for a schema property. */
function propertyConfig(
  property: PropertySpec,
  databaseIds: Partial<Record<DatabaseKey, string>>,
): Record<string, unknown> {
  switch (property.kind) {
    case "title":
      return { title: {} };
    case "rich_text":
      return { rich_text: {} };
    case "number":
      return { number: { format: "number" } };
    case "date":
      return { date: {} };
    case "select":
      return {
        select: { options: (property.options ?? []).map((name) => ({ name })) },
      };
    case "multi_select":
      return {
        multi_select: { options: (property.options ?? []).map((name) => ({ name })) },
      };
    case "relation": {
      const target = databaseSpec(property.relatesTo!);
      const targetId = databaseIds[property.relatesTo!] ?? process.env[target.envVar];
      if (!targetId) {
        throw new Error(
          `Relation ${property.name} needs ${target.envVar}, but it was not created ` +
            `yet. This is an ordering bug in NOTION_SCHEMA.`,
        );
      }
      return {
        relation: {
          database_id: targetId,
          type: "single_property",
          single_property: {},
        },
      };
    }
  }
}

async function resolveParentPage(
  client: Client,
  env: string,
): Promise<{ pageId: string; env: string }> {
  const configured = process.env.NOTION_PARENT_PAGE_ID;
  if (configured) {
    console.log(`= Parent page (from .env.local): ${configured}`);
    return { pageId: configured, env };
  }
  const page = await client.pages.create({
    parent: { type: "workspace", workspace: true },
    properties: {
      title: { title: [{ type: "text", text: { content: PARENT_PAGE_TITLE } }] },
    },
  } as unknown as CreatePageArgs);
  console.log(`+ Parent page "${PARENT_PAGE_TITLE}" (${page.id})`);
  return { pageId: page.id, env: setEnvValue(env, "NOTION_PARENT_PAGE_ID", page.id) };
}

/** Add properties and select options declared in the schema but absent in Notion. */
async function reconcileDatabase(
  client: Client,
  databaseId: string,
  specTitle: string,
  databaseIds: Partial<Record<DatabaseKey, string>>,
): Promise<number> {
  const spec = NOTION_SCHEMA.find((item) => item.title === specTitle)!;
  const current = await client.databases.retrieve({ database_id: databaseId });
  const existing = current.properties as Record<
    string,
    { type?: string; select?: { options?: { name: string }[] }; multi_select?: { options?: { name: string }[] } }
  >;

  const additions: Record<string, unknown> = {};

  for (const property of spec.properties) {
    const found = existing[property.name];
    if (!found) {
      additions[property.name] = propertyConfig(property, databaseIds);
      console.log(`    + property ${spec.title}.${property.name}`);
      continue;
    }
    if (property.kind !== "select" && property.kind !== "multi_select") continue;
    if (!property.options) continue;
    const bucket = property.kind === "select" ? found.select : found.multi_select;
    const present = new Set((bucket?.options ?? []).map((option) => option.name));
    const missing = property.options.filter((option) => !present.has(option));
    if (missing.length === 0) continue;
    additions[property.name] = {
      [property.kind]: {
        options: [
          ...(bucket?.options ?? []).map((option) => ({ name: option.name })),
          ...missing.map((name) => ({ name })),
        ],
      },
    };
    console.log(
      `    + ${spec.title}.${property.name} options: ${missing.join(", ")}`,
    );
  }

  const count = Object.keys(additions).length;
  if (count > 0) {
    await client.databases.update({
      database_id: databaseId,
      properties: additions as UpdateDatabaseArgs["properties"],
    });
  }
  return count;
}

async function main() {
  const token = requireToken();
  const client = new Client({ auth: token });

  console.log("Kinetex LiveOps — Notion setup\n");

  let env = readEnvFile();
  const parent = await resolveParentPage(client, env);
  env = parent.env;

  const databaseIds = {} as Record<DatabaseKey, string>;
  let upgraded = 0;

  for (const spec of NOTION_SCHEMA) {
    const existingId = process.env[spec.envVar];
    if (existingId) {
      databaseIds[spec.key] = existingId;
      const changes = await reconcileDatabase(client, existingId, spec.title, databaseIds);
      console.log(
        `= ${spec.title} ${changes > 0 ? `(upgraded, ${changes} change(s))` : "(up to date)"}`,
      );
      upgraded += changes;
      continue;
    }

    const properties: Record<string, unknown> = {};
    for (const property of spec.properties) {
      properties[property.name] = propertyConfig(property, databaseIds);
    }

    const database = await client.databases.create({
      parent: { type: "page_id", page_id: parent.pageId },
      title: [{ type: "text", text: { content: spec.title } }],
      properties: asProperties(properties),
    });

    databaseIds[spec.key] = database.id;
    env = setEnvValue(env, spec.envVar, database.id);
    console.log(`+ ${spec.title} (${spec.envVar})`);
  }

  env = setEnvValue(env, "KINETEX_SOURCE", "notion");
  writeFileSync(ENV_PATH, env, "utf8");

  console.log(
    `\n${NOTION_SCHEMA.length} databases ready${upgraded > 0 ? `, ${upgraded} schema change(s) applied` : ""}. Ids written to ${ENV_PATH}.`,
  );
  console.log("KINETEX_SOURCE=notion is set.");
  console.log("\nNext: bun run notion:seed");
}

main().catch((error) => {
  console.error("\nSetup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
