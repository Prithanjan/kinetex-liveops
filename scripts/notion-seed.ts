/**
 * Populate the Notion workspace with the demo event graph.
 *
 * Run after `bun run notion:setup`:
 *   bun run notion:seed
 *
 * Idempotent: any page whose Domain ID already exists is skipped and reused, so
 * re-running never duplicates the demo. Run `bun run notion:reset` (see
 * scripts/notion-reset.ts) to archive everything first.
 */
import { Client } from "@notionhq/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EventGraph } from "../lib/domain/types";
import { requireNotionConfig } from "../lib/data/notion/config";
import { readWorkspace } from "../lib/data/notion/read";
import {
  changeLogToProperties,
  equipmentToProperties,
  eventToProperties,
  groupToProperties,
  personToProperties,
  sessionToProperties,
  taskToProperties,
  venueToProperties,
  type PageIdResolver,
} from "../lib/data/notion/mapping";
import type { DatabaseKey } from "../lib/data/notion/schema";

type CreatePageArgs = Parameters<Client["pages"]["create"]>[0];

function asProperties(value: Record<string, unknown>): CreatePageArgs["properties"] {
  return value as unknown as CreatePageArgs["properties"];
}

const SEED_PATH = path.join(process.cwd(), "data", "seed", "event-graph.json");

async function main() {
  const config = requireNotionConfig();
  const client = new Client({ auth: config.token });
  const graph = JSON.parse(readFileSync(SEED_PATH, "utf8")) as EventGraph;

  console.log("Kinetex LiveOps — Notion seed\n");

  const snapshot = await readWorkspace(client, config);
  const pageIds = snapshot.pageIds;
  const resolve: PageIdResolver = (key, domainId) => pageIds.get(`${key}:${domainId}`);

  let created = 0;
  let reused = 0;

  async function put(
    key: DatabaseKey,
    domainId: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    if (pageIds.has(`${key}:${domainId}`)) {
      reused += 1;
      return;
    }
    const page = await client.pages.create({
      parent: { database_id: config.databaseIds[key] },
      properties: asProperties(properties),
    });
    pageIds.set(`${key}:${domainId}`, page.id);
    created += 1;
    console.log(`+ ${key}: ${domainId}`);
  }

  // Order matters: a relation can only point at an existing page.
  for (const event of graph.events) await put("events", event.id, eventToProperties(event));
  for (const item of graph.equipment)
    await put("equipment", item.id, equipmentToProperties(item));
  for (const person of graph.people) await put("people", person.id, personToProperties(person));
  for (const group of graph.participantGroups)
    await put("groups", group.id, groupToProperties(group));
  for (const venue of graph.venues) await put("venues", venue.id, venueToProperties(venue, resolve));
  for (const session of graph.sessions)
    await put("sessions", session.id, sessionToProperties(session, resolve));
  for (const task of graph.tasks) await put("tasks", task.id, taskToProperties(task, resolve));
  for (const entry of graph.changeLog)
    await put("changeLog", entry.id, changeLogToProperties(entry, resolve));

  console.log(`\nCreated ${created} page(s), reused ${reused}.`);
  console.log("\nNext: bun run dev  →  open http://localhost:3000/change");
}

main().catch((error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
