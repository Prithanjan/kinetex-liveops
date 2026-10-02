import type { Client } from "@notionhq/client";
import type { ApplyResult } from "@/lib/engine/apply";
import type { NotionConfig } from "./config";
import {
  type PageIdResolver,
  changeLogToProperties,
  sessionToProperties,
  taskToProperties,
} from "./mapping";
import { loadPageIds } from "./read";

type CreatePageArgs = Parameters<Client["pages"]["create"]>[0];
type UpdatePageArgs = Parameters<Client["pages"]["update"]>[0];

function asProperties(value: Record<string, unknown>): CreatePageArgs["properties"] {
  return value as unknown as CreatePageArgs["properties"];
}

export interface NotionWriteResult {
  changeLogPageId: string;
  taskPageIds: string[];
}

/**
 * Incremental write-back. We do NOT rewrite the whole workspace on approval:
 * we update the one moved session, create the tasks this change produced, and
 * create the one change log page.
 *
 * Order matters: the change log page is created first because each task relates
 * to it. (The change log stores task ids as text, so there is no cycle.)
 */
export async function applyToWorkspace(
  client: Client,
  config: NotionConfig,
  result: ApplyResult,
): Promise<NotionWriteResult> {
  const pageIds = await loadPageIds(client, config);
  const resolve: PageIdResolver = (key, domainId) =>
    pageIds.get(`${key}:${domainId}`);

  const changeLogPage = await client.pages.create({
    parent: { database_id: config.databaseIds.changeLog },
    properties: asProperties(changeLogToProperties(result.entry, resolve)),
  });
  pageIds.set(`changeLog:${result.entry.id}`, changeLogPage.id);

  const createdTasks = result.graph.tasks.filter(
    (task) => task.sourceChangeId === result.entry.id,
  );
  const taskPageIds: string[] = [];
  for (const task of createdTasks) {
    const page = await client.pages.create({
      parent: { database_id: config.databaseIds.tasks },
      properties: asProperties(taskToProperties(task, resolve)),
    });
    pageIds.set(`tasks:${task.id}`, page.id);
    taskPageIds.push(page.id);
  }

  const session = result.graph.sessions.find(
    (item) => item.id === result.entry.sessionId,
  );
  const sessionPageId = resolve("sessions", result.entry.sessionId);
  if (session && sessionPageId) {
    const sessionProps = sessionToProperties(session, resolve);
    await client.pages.update({
      page_id: sessionPageId,
      properties: { Venue: sessionProps.Venue } as UpdatePageArgs["properties"],
    });
  }

  return { changeLogPageId: changeLogPage.id, taskPageIds };
}
