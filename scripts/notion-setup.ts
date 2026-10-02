/**
 * Create the Kinetex LiveOps databases in Notion, then write their ids into
 * .env.local.
 *
 * Only prerequisite: NOTION_TOKEN in .env.local. If NOTION_PARENT_PAGE_ID is
 * empty, this creates a top level "Kinetex LiveOps" page and uses it as the
 * parent. Everything else is automated.
 *
 * Run:  bun run notion:setup
 * Re-run is safe: databases already recorded in .env.local are reused.
 */
import { Client } from "@notionhq/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { NOTION_SCHEMA, databaseSpec, type DatabaseKey } from "../lib/data/notion/schema";

const ENV_PATH = ".env.local";
const PARENT_PAGE_TITLE = "Kinetex LiveOps";

type CreateDatabaseArgs = Parameters<Client["databases"]["create"]>[0];
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

/**
 * Use the configured parent page, or create a top level page for the project.
 * Creating a workspace parent page works for internal integrations with the
 * insert content capability.
 */
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
      title: {
        title: [{ type: "text", text: { content: PARENT_PAGE_TITLE } }],
      },
    },
  } as unknown as CreatePageArgs);

  console.log(`+ Parent page "${PARENT_PAGE_TITLE}" (${page.id})`);
  return { pageId: page.id, env: setEnvValue(env, "NOTION_PARENT_PAGE_ID", page.id) };
}

async function main() {
  const token = requireToken();
  const client = new Client({ auth: token });

  console.log("Kinetex LiveOps — Notion setup\n");

  let env = readEnvFile();
  const parent = await resolveParentPage(client, env);
  env = parent.env;

  const databaseIds = {} as Record<DatabaseKey, string>;

  for (const spec of NOTION_SCHEMA) {
    const existing = process.env[spec.envVar];
    if (existing) {
      databaseIds[spec.key] = existing;
      console.log(`= ${spec.title} (reusing ${spec.envVar})`);
      continue;
    }

    const properties: Record<string, unknown> = {};
    for (const property of spec.properties) {
      switch (property.kind) {
        case "title":
          properties[property.name] = { title: {} };
          break;
        case "rich_text":
          properties[property.name] = { rich_text: {} };
          break;
        case "number":
          properties[property.name] = { number: { format: "number" } };
          break;
        case "date":
          properties[property.name] = { date: {} };
          break;
        case "select":
          properties[property.name] = {
            select: { options: (property.options ?? []).map((name) => ({ name })) },
          };
          break;
        case "multi_select":
          properties[property.name] = {
            multi_select: { options: (property.options ?? []).map((name) => ({ name })) },
          };
          break;
        case "relation": {
          const target = databaseSpec(property.relatesTo!);
          const targetId = databaseIds[property.relatesTo!] ?? process.env[target.envVar];
          if (!targetId) {
            throw new Error(
              `Relation ${spec.title}.${property.name} needs ${target.envVar}, ` +
                `but it was not created yet. This is an ordering bug in NOTION_SCHEMA.`,
            );
          }
          properties[property.name] = {
            relation: {
              database_id: targetId,
              type: "single_property",
              single_property: {},
            },
          };
          break;
        }
      }
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

  console.log(`\nWrote ${NOTION_SCHEMA.length} database ids to ${ENV_PATH}.`);
  console.log("KINETEX_SOURCE=notion is set.");
  console.log("\nNext: bun run notion:seed");
}

main().catch((error) => {
  console.error("\nSetup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
