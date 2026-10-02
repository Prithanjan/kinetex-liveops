import { Client } from "@notionhq/client";
import type { DatabaseKey } from "./schema";
import { NOTION_SCHEMA } from "./schema";

export interface NotionConfig {
  token: string;
  parentPageId: string;
  databaseIds: Record<DatabaseKey, string>;
}

function envDatabaseIds(): Partial<Record<DatabaseKey, string>> {
  const ids: Partial<Record<DatabaseKey, string>> = {};
  for (const spec of NOTION_SCHEMA) {
    const value = process.env[spec.envVar];
    if (value) ids[spec.key] = value;
  }
  return ids;
}

/**
 * Returns every missing piece of configuration in one message, so setup is a
 * single fix rather than a sequence of failures.
 */
export function missingNotionEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.NOTION_TOKEN) missing.push("NOTION_TOKEN");
  if (!process.env.NOTION_PARENT_PAGE_ID) missing.push("NOTION_PARENT_PAGE_ID");
  const ids = envDatabaseIds();
  for (const spec of NOTION_SCHEMA) {
    if (!ids[spec.key]) missing.push(spec.envVar);
  }
  return missing;
}

export function isNotionConfigured(): boolean {
  return missingNotionEnv().length === 0;
}

export function requireNotionConfig(): NotionConfig {
  const missing = missingNotionEnv();
  if (missing.length > 0) {
    throw new Error(
      `Notion source is selected but not configured. Missing: ${missing.join(", ")}. ` +
        `Run \`bun run notion:setup\` after setting NOTION_TOKEN and ` +
        `NOTION_PARENT_PAGE_ID, or set KINETEX_SOURCE=local.`,
    );
  }
  return {
    token: process.env.NOTION_TOKEN!,
    parentPageId: process.env.NOTION_PARENT_PAGE_ID!,
    databaseIds: envDatabaseIds() as Record<DatabaseKey, string>,
  };
}

let cached: { client: Client; token: string } | null = null;

export function notionClient(token: string): Client {
  if (cached?.token === token) return cached.client;
  const client = new Client({ auth: token });
  cached = { client, token };
  return client;
}
