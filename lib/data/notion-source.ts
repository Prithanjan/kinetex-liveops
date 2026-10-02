import type { EventGraph } from "@/lib/domain/types";
import type { ApplyResult } from "@/lib/engine/apply";
import { notionClient, requireNotionConfig } from "./notion/config";
import { readWorkspace } from "./notion/read";
import { applyToWorkspace } from "./notion/write";
import type { EventSource } from "./source";

/**
 * Notion-backed source.
 *
 * Reads every event record from the workspace databases, and writes an approved
 * change back incrementally: the moved session is updated, the tasks this change
 * produced are created, and one linked change log page is created.
 *
 * Webhook note: Notion documents webhook support, but some page-update events
 * can be aggregated or delayed. This source is read/write on demand; it makes no
 * instant-synchronization claim for edits made directly in Notion.
 */
export const notionSource: EventSource = {
  kind: "notion",

  async readGraph(): Promise<EventGraph> {
    const config = requireNotionConfig();
    const client = notionClient(config.token);
    const snapshot = await readWorkspace(client, config);
    return snapshot.graph;
  },

  async applyApprovedChange(result: ApplyResult): Promise<void> {
    const config = requireNotionConfig();
    const client = notionClient(config.token);
    await applyToWorkspace(client, config, result);
  },

  async writeGraph(graph: EventGraph): Promise<void> {
    // Full rewrites are not how Notion should be used; see scripts/notion-seed.ts
    // for the initial population path. Rejecting here prevents a silent disaster.
    void graph;
    throw new Error(
      "notionSource.writeGraph is intentionally unsupported. Use applyApprovedChange, " +
        "or scripts/notion-seed.ts to populate the workspace.",
    );
  },
};
