import type { Client } from "@notionhq/client";
import type { EventGraph } from "@/lib/domain/types";
import type { NotionConfig } from "./config";
import {
  type NotionPageLike,
  pageDomainId,
  pageToChangeLogEntry,
  pageToEquipment,
  pageToEvent,
  pageToGroup,
  pageToPerson,
  pageToSession,
  pageToTask,
  pageToVenue,
  readRelation,
} from "./mapping";
import { type DatabaseKey, databaseSpec } from "./schema";

/** All pages in one database, following pagination. */
async function queryAll(
  client: Client,
  databaseId: string,
): Promise<NotionPageLike[]> {
  const pages: NotionPageLike[] = [];
  let cursor: string | undefined;
  do {
    const response = await client.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const result of response.results) {
      if ("properties" in result) {
        pages.push(result as unknown as NotionPageLike);
      }
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

/** Maps a Notion page id to the domain id we stamped on the page. */
function pageIdToDomainId(pages: NotionPageLike[]): Map<string, string> {
  return new Map(pages.map((page) => [page.id, pageDomainId(page) || page.id]));
}

export interface WorkspaceSnapshot {
  graph: EventGraph;
  /** `${databaseKey}:${domainId}` → page id, for write-back. */
  pageIds: Map<string, string>;
}

export async function readWorkspace(
  client: Client,
  config: NotionConfig,
): Promise<WorkspaceSnapshot> {
  const keys: DatabaseKey[] = [
    "events",
    "equipment",
    "people",
    "groups",
    "venues",
    "sessions",
    "tasks",
    "changeLog",
  ];

  const pages = {} as Record<DatabaseKey, NotionPageLike[]>;
  for (const key of keys) {
    pages[key] = await queryAll(client, config.databaseIds[key]);
  }

  const byPageId: Record<DatabaseKey, Map<string, string>> = {
    events: pageIdToDomainId(pages.events),
    equipment: pageIdToDomainId(pages.equipment),
    people: pageIdToDomainId(pages.people),
    groups: pageIdToDomainId(pages.groups),
    venues: pageIdToDomainId(pages.venues),
    sessions: pageIdToDomainId(pages.sessions),
    tasks: pageIdToDomainId(pages.tasks),
    changeLog: pageIdToDomainId(pages.changeLog),
  };

  const mapRelation = (ids: string[], key: DatabaseKey) =>
    ids.map((id) => byPageId[key].get(id) ?? id);

  const events = pages.events.map(pageToEvent);
  const equipment = pages.equipment.map(pageToEquipment);
  const people = pages.people.map(pageToPerson);
  const participantGroups = pages.groups.map(pageToGroup);

  const venues = pages.venues.map((page) => {
    const venue = pageToVenue(page);
    return { ...venue, equipmentIds: mapRelation(venue.equipmentIds, "equipment") };
  });

  const sessions = pages.sessions.map((page) =>
    pageToSession(
      page,
      byPageId.equipment,
      byPageId.people,
      byPageId.groups,
      byPageId.venues,
      byPageId.events,
    ),
  );

  const tasks = pages.tasks.map((page) =>
    pageToTask(page, byPageId.people, byPageId.sessions, byPageId.changeLog),
  );

  const changeLog = pages.changeLog.map((page) =>
    pageToChangeLogEntry(page, byPageId.venues, byPageId.sessions, byPageId.events),
  );

  const pageIds = new Map<string, string>();
  for (const key of keys) {
    for (const page of pages[key]) {
      const domainId = pageDomainId(page) || page.id;
      pageIds.set(`${key}:${domainId}`, page.id);
    }
  }

  return {
    graph: {
      events,
      venues,
      equipment,
      sessions,
      people,
      participantGroups,
      tasks,
      changeLog,
    },
    pageIds,
  };
}

/** Fetch only the page ids, for a write-back without a full read. */
export async function loadPageIds(
  client: Client,
  config: NotionConfig,
): Promise<Map<string, string>> {
  const snapshot = await readWorkspace(client, config);
  return snapshot.pageIds;
}

/** Unused today, kept so callers can inspect raw relations while debugging. */
export function debugRelations(page: NotionPageLike, property: string): string[] {
  return readRelation(page, property);
}

export { databaseSpec };
