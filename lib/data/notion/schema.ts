/**
 * The Notion schema, defined once.
 *
 * `scripts/notion-setup.ts` creates databases from this, and
 * `lib/data/notion/mapping.ts` reads and writes pages by the exact property
 * names declared here. One source of truth, so they cannot drift.
 *
 * Every database carries a `Domain ID` rich text property. That is how a
 * domain record maps to its Notion page id, so write-back can find and update
 * the right page without guessing from the human title.
 */

export type DatabaseKey =
  | "events"
  | "equipment"
  | "venues"
  | "people"
  | "groups"
  | "sessions"
  | "tasks"
  | "changeLog";

export type PropertyKind =
  | "title"
  | "rich_text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "relation";

export interface PropertySpec {
  name: string;
  kind: PropertyKind;
  options?: string[];
  relatesTo?: DatabaseKey;
}

export interface DatabaseSpec {
  key: DatabaseKey;
  /** Display name of the database in Notion. */
  title: string;
  /** Name of the title property inside the database. */
  titleProperty: string;
  /** Env var the setup script writes the created database id into. */
  envVar: string;
  properties: PropertySpec[];
}

export const ROLE_OPTIONS = [
  "organizer",
  "logistics",
  "volunteer_coordinator",
  "communications",
  "leadership",
] as const;

export const STATUS_OPTIONS = ["planned", "in_planning", "live", "closed"] as const;
export const EQUIPMENT_STATUS_OPTIONS = ["available", "in_use", "maintenance"] as const;
export const TASK_STATUS_OPTIONS = ["todo", "in_progress", "done", "blocked"] as const;
export const CHANGE_TYPE_OPTIONS = ["venue_change"] as const;

/** Every database gets this, so domain ids survive a round trip. */
export const DOMAIN_ID_PROPERTY = "Domain ID";

const domainId: PropertySpec = { name: DOMAIN_ID_PROPERTY, kind: "rich_text" };

/**
 * Ordered so relations can be created: a relation needs its target database to
 * exist. Events, Equipment, People and Groups have no relations and come first.
 */
export const NOTION_SCHEMA: DatabaseSpec[] = [
  {
    key: "events",
    title: "Events",
    titleProperty: "Name",
    envVar: "NOTION_DB_EVENTS",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Date", kind: "date" },
      { name: "Status", kind: "select", options: [...STATUS_OPTIONS] },
    ],
  },
  {
    key: "equipment",
    title: "Equipment",
    titleProperty: "Name",
    envVar: "NOTION_DB_EQUIPMENT",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Type", kind: "rich_text" },
      { name: "Status", kind: "select", options: [...EQUIPMENT_STATUS_OPTIONS] },
    ],
  },
  {
    key: "people",
    title: "People",
    titleProperty: "Name",
    envVar: "NOTION_DB_PEOPLE",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Roles", kind: "multi_select", options: [...ROLE_OPTIONS] },
      { name: "Skills", kind: "rich_text" },
    ],
  },
  {
    key: "groups",
    title: "Participant Groups",
    titleProperty: "Name",
    envVar: "NOTION_DB_GROUPS",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Size", kind: "number" },
    ],
  },
  {
    key: "venues",
    title: "Venues",
    titleProperty: "Name",
    envVar: "NOTION_DB_VENUES",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Capacity", kind: "number" },
      { name: "Equipment", kind: "relation", relatesTo: "equipment" },
    ],
  },
  {
    key: "sessions",
    title: "Sessions",
    titleProperty: "Title",
    envVar: "NOTION_DB_SESSIONS",
    properties: [
      { name: "Title", kind: "title" },
      domainId,
      { name: "Event", kind: "relation", relatesTo: "events" },
      { name: "Start", kind: "date" },
      { name: "End", kind: "date" },
      { name: "Venue", kind: "relation", relatesTo: "venues" },
      { name: "Required Equipment", kind: "relation", relatesTo: "equipment" },
      { name: "Assigned People", kind: "relation", relatesTo: "people" },
      { name: "Participant Groups", kind: "relation", relatesTo: "groups" },
    ],
  },
  {
    // Created before Tasks because Tasks.Source Change relates to it. Change
    // Log stores follow-up task ids as rich text, not a relation, to avoid a
    // cycle (Tasks.Source Change -> Change Log, and back). See docs/data-model.md.
    key: "changeLog",
    title: "Change Log",
    titleProperty: "Id",
    envVar: "NOTION_DB_CHANGELOG",
    properties: [
      { name: "Id", kind: "title" },
      domainId,
      { name: "Type", kind: "select", options: [...CHANGE_TYPE_OPTIONS] },
      { name: "Event", kind: "relation", relatesTo: "events" },
      { name: "Session", kind: "relation", relatesTo: "sessions" },
      { name: "From Venue", kind: "relation", relatesTo: "venues" },
      { name: "To Venue", kind: "relation", relatesTo: "venues" },
      { name: "Reason", kind: "rich_text" },
      { name: "Affected Records", kind: "rich_text" },
      { name: "Follow-up Task IDs", kind: "rich_text" },
      { name: "Conflicts", kind: "rich_text" },
      { name: "Approved By", kind: "select", options: [...ROLE_OPTIONS] },
      { name: "Summary", kind: "rich_text" },
      { name: "Created", kind: "date" },
    ],
  },
  {
    key: "tasks",
    title: "Tasks",
    titleProperty: "Title",
    envVar: "NOTION_DB_TASKS",
    properties: [
      { name: "Title", kind: "title" },
      domainId,
      { name: "Owner Role", kind: "select", options: [...ROLE_OPTIONS] },
      { name: "Owner", kind: "relation", relatesTo: "people" },
      { name: "Session", kind: "relation", relatesTo: "sessions" },
      { name: "Status", kind: "select", options: [...TASK_STATUS_OPTIONS] },
      { name: "Due", kind: "date" },
      { name: "Source Change", kind: "relation", relatesTo: "changeLog" },
    ],
  },
];

export function databaseSpec(key: DatabaseKey): DatabaseSpec {
  const spec = NOTION_SCHEMA.find((item) => item.key === key);
  if (!spec) throw new Error(`Unknown database key: ${key}`);
  return spec;
}
