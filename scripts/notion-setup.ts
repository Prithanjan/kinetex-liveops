/**
 * Create the Kinetex LiveOps databases in Notion, then write their ids into
 * .env.local. This removes the manual step of building 8 databases by hand.
 *
 * Prerequisites (the only manual work):
 *   1. Create one empty page in Notion, named "Kinetex LiveOps".
 *   2. Create an internal integration and copy its secret.
 *   3. Share that page with the integration (⋯ → Connections).
 *   4. Put NOTION_TOKEN and NOTION_PARENT_PAGE_ID in .env.local.
 *
 * Run:  bun run notion:setup
 * Re-run is safe: databases already recorded in .env.local are reused.
 */
import { Client } from "@notionhq/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { NOTION_SCHEMA, databaseSpec, type DatabaseKey } from "../lib/data/notion/schema";

const ENV_PATH = ".env.local";

type CreateDatabaseArgs = Parameters<Client["databases"]["create"]>[0];

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

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`\nMissing ${name} in .env.local.`);
    console.error(
      "Create one page in Notion, share it with your integration, then set " +
        "NOTION_TOKEN and NOTION_PARENT_PAGE_ID. See docs/notion-setup.md.\n",
    );
    process.exit(1);
  }
  return value;
}

async function main() {
  const token = requiredEnv("NOTION_TOKEN");
  const parentPageId = requiredEnv("NOTION_PARENT_PAGE_ID");
  const client = new Client({ auth: token });

  console.log("Kinetex LiveOps — Notion setup\n");

  const databaseIds = {} as Record<DatabaseKey, string>;
  let env = readEnvFile();

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
      parent: { type: "page_id", page_id: parentPageId },
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
  console.log("\nNext: bun run notion:seed   (populate the demo event)");
}

main().catch((error) => {
  console.error("\nSetup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
