import type {
  ChangeLogEntry,
  Conflict,
  Equipment,
  EventRecord,
  ParticipantGroup,
  Person,
  Role,
  Session,
  Task,
  Venue,
} from "@/lib/domain/types";
import type { DatabaseKey } from "./schema";

/**
 * Pure mapping. No network here, so it is unit-testable with fixture pages.
 * Property names come from lib/data/notion/schema.ts.
 */

/** A Notion property value, narrowed to the fields we read. */
export interface PropValue {
  type?: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  number?: number | null;
  select?: { name: string } | null;
  multi_select?: { name: string }[];
  date?: { start: string | null } | null;
  relation?: { id: string }[];
}

export interface NotionPageLike {
  id: string;
  properties?: Record<string, PropValue>;
}

type Props = Record<string, PropValue>;

function props(page: NotionPageLike): Props {
  return page.properties ?? {};
}

export function readTitle(page: NotionPageLike, name: string): string {
  return props(page)[name]?.title?.map((part) => part.plain_text).join("") ?? "";
}

export function readRichText(page: NotionPageLike, name: string): string {
  return (
    props(page)[name]?.rich_text?.map((part) => part.plain_text).join("") ?? ""
  );
}

export function readNumber(page: NotionPageLike, name: string): number {
  return props(page)[name]?.number ?? 0;
}

export function readSelect(page: NotionPageLike, name: string): string {
  return props(page)[name]?.select?.name ?? "";
}

export function readMultiSelect(page: NotionPageLike, name: string): string[] {
  return props(page)[name]?.multi_select?.map((option) => option.name) ?? [];
}

export function readDate(page: NotionPageLike, name: string): string {
  return props(page)[name]?.date?.start ?? "";
}

export function readRelation(page: NotionPageLike, name: string): string[] {
  return props(page)[name]?.relation?.map((item) => item.id) ?? [];
}

/** The domain id we stamped on the page when it was written. */
export function pageDomainId(page: NotionPageLike): string {
  return readRichText(page, "Domain ID");
}

// ── Reading: page → domain entity ──────────────────────────────────────────

export function pageToEvent(page: NotionPageLike): EventRecord {
  return {
    id: pageDomainId(page) || page.id,
    name: readTitle(page, "Name"),
    date: readDate(page, "Date"),
    status: (readSelect(page, "Status") || "planned") as EventRecord["status"],
  };
}

export function pageToEquipment(page: NotionPageLike): Equipment {
  return {
    id: pageDomainId(page) || page.id,
    name: readTitle(page, "Name"),
    type: readRichText(page, "Type"),
    status: (readSelect(page, "Status") || "available") as Equipment["status"],
  };
}

export function pageToPerson(page: NotionPageLike): Person {
  return {
    id: pageDomainId(page) || page.id,
    name: readTitle(page, "Name"),
    roles: readMultiSelect(page, "Roles") as Role[],
    skills: readRichText(page, "Skills")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
  };
}

export function pageToGroup(page: NotionPageLike): ParticipantGroup {
  return {
    id: pageDomainId(page) || page.id,
    name: readTitle(page, "Name"),
    size: readNumber(page, "Size"),
  };
}

export function pageToVenue(page: NotionPageLike): Venue {
  return {
    id: pageDomainId(page) || page.id,
    name: readTitle(page, "Name"),
    capacity: readNumber(page, "Capacity"),
    equipmentIds: readRelation(page, "Equipment"),
  };
}

export function pageToSession(
  page: NotionPageLike,
  equipmentIdByPageId: Map<string, string>,
  peopleIdByPageId: Map<string, string>,
  groupIdByPageId: Map<string, string>,
  venueIdByPageId: Map<string, string>,
  eventIdByPageId: Map<string, string>,
): Session {
  const mapIds = (pageIds: string[], lookup: Map<string, string>) =>
    pageIds.map((pageId) => lookup.get(pageId) ?? pageId);
  return {
    id: pageDomainId(page) || page.id,
    eventId: mapIds(readRelation(page, "Event"), eventIdByPageId)[0] ?? "",
    title: readTitle(page, "Title"),
    startTime: readDate(page, "Start"),
    endTime: readDate(page, "End"),
    venueId: mapIds(readRelation(page, "Venue"), venueIdByPageId)[0] ?? "",
    requiredEquipmentIds: mapIds(
      readRelation(page, "Required Equipment"),
      equipmentIdByPageId,
    ),
    assignedPersonIds: mapIds(readRelation(page, "Assigned People"), peopleIdByPageId),
    participantGroupIds: mapIds(
      readRelation(page, "Participant Groups"),
      groupIdByPageId,
    ),
  };
}

export function pageToTask(
  page: NotionPageLike,
  peopleIdByPageId: Map<string, string>,
  sessionIdByPageId: Map<string, string>,
  changeIdByPageId: Map<string, string>,
): Task {
  const sessionPageId = readRelation(page, "Session")[0];
  const sourcePageId = readRelation(page, "Source Change")[0];
  return {
    id: pageDomainId(page) || page.id,
    title: readTitle(page, "Title"),
    ownerRole: (readSelect(page, "Owner Role") || "organizer") as Role,
    ownerPersonId: peopleIdByPageId.get(readRelation(page, "Owner")[0] ?? ""),
    sessionId: sessionPageId ? sessionIdByPageId.get(sessionPageId) : undefined,
    status: (readSelect(page, "Status") || "todo") as Task["status"],
    dueAt: readDate(page, "Due"),
    sourceChangeId: sourcePageId ? changeIdByPageId.get(sourcePageId) : undefined,
  };
}

export function pageToChangeLogEntry(
  page: NotionPageLike,
  venueIdByPageId: Map<string, string>,
  sessionIdByPageId: Map<string, string>,
  eventIdByPageId: Map<string, string>,
): ChangeLogEntry {
  const mapFirst = (pageIds: string[], lookup: Map<string, string>) =>
    mapIds(pageIds, lookup)[0] ?? "";
  return {
    id: readTitle(page, "Id") || pageDomainId(page) || page.id,
    createdAt: readDate(page, "Created") || new Date().toISOString(),
    changeType: (readSelect(page, "Type") || "venue_change") as ChangeLogEntry["changeType"],
    eventId: mapFirst(readRelation(page, "Event"), eventIdByPageId),
    sessionId: mapFirst(readRelation(page, "Session"), sessionIdByPageId),
    fromVenueId: mapFirst(readRelation(page, "From Venue"), venueIdByPageId),
    toVenueId: mapFirst(readRelation(page, "To Venue"), venueIdByPageId),
    reason: readRichText(page, "Reason") || undefined,
    affectedRecordIds: readRichText(page, "Affected Records").split(",").filter(Boolean),
    followUpTaskIds: readRichText(page, "Follow-up Task IDs").split(",").filter(Boolean),
    approvedByRole: (readSelect(page, "Approved By") || "organizer") as Role,
    summary: readRichText(page, "Summary"),
    conflicts: parseConflicts(readRichText(page, "Conflicts")),
  };
}

function parseConflicts(raw: string): Conflict[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Conflict[]) : undefined;
  } catch {
    return undefined;
  }
}

function mapIds(pageIds: string[], lookup: Map<string, string>): string[] {
  return pageIds.map((pageId) => lookup.get(pageId) ?? pageId);
}

// ── Writing: domain entity → Notion properties ─────────────────────────────

export type PageIdResolver = (key: DatabaseKey, domainId: string) => string | undefined;

function title(value: string) {
  return { title: [{ type: "text", text: { content: value || " " } }] };
}

function richText(value: string) {
  return { rich_text: [{ type: "text", text: { content: value } }] };
}

function domainIdProperty(id: string) {
  return richText(id);
}

function relation(pageIds: string[]) {
  return { relation: pageIds.map((id) => ({ id })) };
}

function resolveMany(
  resolve: PageIdResolver,
  key: DatabaseKey,
  domainIds: string[],
): string[] {
  return domainIds
    .map((domainId) => resolve(key, domainId))
    .filter((pageId): pageId is string => Boolean(pageId));
}

export function eventToProperties(event: EventRecord): Record<string, unknown> {
  return {
    Name: title(event.name),
    "Domain ID": domainIdProperty(event.id),
    Date: { date: { start: event.date } },
    Status: { select: { name: event.status } },
  };
}

export function equipmentToProperties(item: Equipment): Record<string, unknown> {
  return {
    Name: title(item.name),
    "Domain ID": domainIdProperty(item.id),
    Type: richText(item.type),
    Status: { select: { name: item.status } },
  };
}

export function personToProperties(person: Person): Record<string, unknown> {
  return {
    Name: title(person.name),
    "Domain ID": domainIdProperty(person.id),
    Roles: { multi_select: person.roles.map((name) => ({ name })) },
    Skills: richText(person.skills.join(", ")),
  };
}

export function groupToProperties(group: ParticipantGroup): Record<string, unknown> {
  return {
    Name: title(group.name),
    "Domain ID": domainIdProperty(group.id),
    Size: { number: group.size },
  };
}

export function venueToProperties(
  venue: Venue,
  resolve: PageIdResolver,
): Record<string, unknown> {
  return {
    Name: title(venue.name),
    "Domain ID": domainIdProperty(venue.id),
    Capacity: { number: venue.capacity },
    Equipment: relation(resolveMany(resolve, "equipment", venue.equipmentIds)),
  };
}

export function sessionToProperties(
  session: Session,
  resolve: PageIdResolver,
): Record<string, unknown> {
  return {
    Title: title(session.title),
    "Domain ID": domainIdProperty(session.id),
    Event: relation(resolveMany(resolve, "events", [session.eventId])),
    Start: { date: { start: session.startTime } },
    End: { date: { start: session.endTime } },
    Venue: relation(resolveMany(resolve, "venues", [session.venueId])),
    "Required Equipment": relation(
      resolveMany(resolve, "equipment", session.requiredEquipmentIds),
    ),
    "Assigned People": relation(
      resolveMany(resolve, "people", session.assignedPersonIds),
    ),
    "Participant Groups": relation(
      resolveMany(resolve, "groups", session.participantGroupIds),
    ),
  };
}

export function taskToProperties(
  task: Task,
  resolve: PageIdResolver,
): Record<string, unknown> {
  return {
    Title: title(task.title),
    "Domain ID": domainIdProperty(task.id),
    "Owner Role": { select: { name: task.ownerRole } },
    Owner: relation(resolveMany(resolve, "people", task.ownerPersonId ? [task.ownerPersonId] : [])),
    Session: relation(resolveMany(resolve, "sessions", task.sessionId ? [task.sessionId] : [])),
    Status: { select: { name: task.status } },
    Due: { date: { start: task.dueAt } },
    "Source Change": relation(
      resolveMany(resolve, "changeLog", task.sourceChangeId ? [task.sourceChangeId] : []),
    ),
  };
}

export function changeLogToProperties(
  entry: ChangeLogEntry,
  resolve: PageIdResolver,
): Record<string, unknown> {
  return {
    Id: title(entry.id),
    "Domain ID": domainIdProperty(entry.id),
    Type: { select: { name: entry.changeType } },
    Event: relation(resolveMany(resolve, "events", [entry.eventId])),
    Session: relation(resolveMany(resolve, "sessions", [entry.sessionId])),
    "From Venue": relation(resolveMany(resolve, "venues", [entry.fromVenueId])),
    "To Venue": relation(resolveMany(resolve, "venues", [entry.toVenueId])),
    Reason: richText(entry.reason ?? ""),
    "Affected Records": richText(entry.affectedRecordIds.join(",")),
    "Follow-up Task IDs": richText(entry.followUpTaskIds.join(",")),
    Conflicts: richText(JSON.stringify(entry.conflicts ?? [])),
    "Approved By": { select: { name: entry.approvedByRole } },
    Summary: richText(entry.summary),
    Created: { date: { start: entry.createdAt } },
  };
}
