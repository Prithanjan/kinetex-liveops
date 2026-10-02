import { Client } from "@notionhq/client";
import type { EventGraph } from "@/lib/domain/types";
import type { EventSource } from "./source";

/**
 * Notion adapter (scaffold).
 *
 * Status: PLACEHOLDER. The mapping from Notion pages to the event graph is
 * deliberately not implemented yet, because it depends on the exact
 * databases you create in your workspace. The interface, client wiring, and
 * failure mode are real so the switch is a config change, not a rewrite.
 *
 * What it would take to make it real:
 *  1. Create the databases listed in docs/data-model.md.
 *  2. Share them with the integration and set NOTION_TOKEN.
 *  3. Set NOTION_DB_* ids in .env.local.
 *  4. Implement `readGraph`/`writeGraph` below against those ids.
 *
 * Webhook note: Notion documents webhook support, but some page-update
 * events can be aggregated or delayed. Webhooks are a stretch goal and this
 * MVP does not claim instant synchronization for edits made in Notion.
 */
const REQUIRED_ENV = ["NOTION_TOKEN"] as const;

function assertConfigured(): Client {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Notion source is selected but not configured. Missing: ${missing.join(", ")}. ` +
        `Set KINETEX_SOURCE=local to use the offline seed, or fill .env.local.`,
    );
  }
  return new Client({ auth: process.env.NOTION_TOKEN });
}

export const notionSource: EventSource = {
  kind: "notion",

  async readGraph(): Promise<EventGraph> {
    assertConfigured();
    throw new Error(
      "Notion readGraph is a scaffold placeholder. See docs/data-model.md for the database mapping.",
    );
  },

  async writeGraph(_graph: EventGraph): Promise<void> {
    assertConfigured();
    throw new Error(
      "Notion writeGraph is a scaffold placeholder. Approved changes are not yet synced to Notion.",
    );
  },
};
