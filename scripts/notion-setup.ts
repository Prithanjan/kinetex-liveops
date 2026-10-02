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
  type DatabaseSpec,
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

/**
 * Options carry a colour. That is the difference between a bare list you have to
 * read and a table you can scan: green is fine, red wants a person.
 */
function optionList(property: PropertySpec): { name: string; color?: string }[] {
  return (property.options ?? []).map((name) => {
    const color = property.optionColors?.[name];
    return color ? { name, color } : { name };
  });
}

/** Icon plus the description paragraph shown under the database title. */
function presentationOf(spec: DatabaseSpec): Record<string, unknown> {
  return {
    icon: { type: "emoji", emoji: spec.icon },
    description: [{ type: "text", text: { content: spec.description } }],
  };
}

/**
 * Give a database its icon and description. Never fatal: a workspace that is
 * fully wired but slightly plain beats a setup run that stops halfway.
 */
async function presentDatabase(client: Client, databaseId: string, spec: DatabaseSpec) {
  try {
    await client.databases.update({
      database_id: databaseId,
      ...presentationOf(spec),
    } as unknown as UpdateDatabaseArgs);
  } catch (error) {
    console.log(
      `    ! could not set icon/description on ${spec.title}: ` +
        `${error instanceof Error ? error.message : error}`,
    );
  }
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
      return { select: { options: optionList(property) } };
    case "multi_select":
      return { multi_select: { options: optionList(property) } };
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
const colourHints: string[] = [];

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
    {
      type?: string;
      select?: { options?: { id?: string; name: string; color?: string }[] };
      multi_select?: { options?: { id?: string; name: string; color?: string }[] };
    }
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
    const currentOptions = bucket?.options ?? [];
    const byName = new Map(currentOptions.map((option) => [option.name, option]));

    // Add what is declared but missing. Existing options are passed through
    // untouched, because Notion rejects any attempt to *recolour* an existing
    // option ("Cannot update color of select with name: …"). Colours therefore
    // land on a fresh workspace, and are noted as a manual step on an existing
    // one. Nothing is ever removed.
    const missing = (property.options ?? []).filter((name) => !byName.has(name));
    if (missing.length === 0) {
      const wantsColour = currentOptions.filter(
        (option) =>
          property.optionColors?.[option.name] &&
          property.optionColors[option.name] !== option.color,
      );
      if (wantsColour.length > 0) {
        colourHints.push(
          `${spec.title} › ${property.name}: colour ${wantsColour
            .map((option) => `${option.name} → ${property.optionColors![option.name]}`)
            .join(", ")}`,
        );
      }
      continue;
    }

    additions[property.name] = {
      [property.kind]: {
        options: [
          ...currentOptions.map((option) => ({ id: option.id, name: option.name })),
          ...missing.map((name) => {
            const color = property.optionColors?.[name];
            return color ? { name, color } : { name };
          }),
        ],
      },
    };
    console.log(
      `    + ${spec.title}.${property.name} options added: ${missing.join(", ")}`,
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

/**
 * A workspace created before the colours existed keeps its default grey pills:
 * recolouring an existing option is not something the Notion API allows. Say so
 * once, with the exact list, instead of failing the whole setup.
 */
function reportColourHints() {
  if (colourHints.length === 0) return;
  console.log(
    "\nManual colour step (Notion's API cannot recolour an existing option):",
  );
  for (const hint of colourHints) console.log(`  · ${hint}`);
  console.log(
    "  Set these once in the Notion UI, or run notion:setup against a fresh workspace " +
      "and the colours are applied automatically.",
  );
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
      await presentDatabase(client, existingId, spec);
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
    await presentDatabase(client, database.id, spec);
    console.log(`+ ${spec.title} (${spec.envVar})`);
  }

  env = setEnvValue(env, "KINETEX_SOURCE", "notion");
  writeFileSync(ENV_PATH, env, "utf8");

  reportColourHints();

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
