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
 *
 * This file also carries the *presentation* of each database (icon, one-line
 * description, section). Keeping it here means the workspace a person opens and
 * the workspace the code talks to can never describe themselves differently.
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

/** The colours Notion's own picker offers. */
export type OptionColor =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface PropertySpec {
  name: string;
  kind: PropertyKind;
  options?: string[];
  /** Colour per option. Unlisted options fall back to Notion's default. */
  optionColors?: Record<string, OptionColor>;
  relatesTo?: DatabaseKey;
}

/** A group of databases that belong together on the home page. */
export interface SectionSpec {
  /** Shown above the first database of the section. */
  title: string;
  blurb: string;
  color: OptionColor;
}

export interface DatabaseSpec {
  key: DatabaseKey;
  /** Display name of the database in Notion. */
  title: string;
  /** Emoji shown beside the title, in the sidebar, and on the home page. */
  icon: string;
  /** One line a person can read without knowing the code. */
  description: string;
  /** What it is for, in plain language, shown on the home page. */
  purpose: string;
  /**
   * How to read this particular table: which column carries the meaning. Shown
   * under the database on the data page, so no two tables read the same way.
   */
  readGuide: string;
  section: SectionSpec;
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
export const CHANGE_TYPE_OPTIONS = [
  "venue_change",
  "time_change",
  "resource_change",
  "person_change",
] as const;

/** A calm, repeatable colour language: green is fine, red needs a person. */
export const ROLE_COLORS: Record<string, OptionColor> = {
  organizer: "brown",
  logistics: "blue",
  volunteer_coordinator: "green",
  communications: "pink",
  leadership: "purple",
};

export const STATUS_COLORS: Record<string, OptionColor> = {
  planned: "gray",
  in_planning: "yellow",
  live: "green",
  closed: "blue",
};

export const EQUIPMENT_STATUS_COLORS: Record<string, OptionColor> = {
  available: "green",
  in_use: "yellow",
  maintenance: "red",
};

export const TASK_STATUS_COLORS: Record<string, OptionColor> = {
  todo: "gray",
  in_progress: "yellow",
  done: "green",
  blocked: "red",
};

export const CHANGE_TYPE_COLORS: Record<string, OptionColor> = {
  venue_change: "orange",
  time_change: "blue",
  resource_change: "purple",
  person_change: "pink",
};

/** Every database gets this, so domain ids survive a round trip. */
export const DOMAIN_ID_PROPERTY = "Domain ID";

const domainId: PropertySpec = { name: DOMAIN_ID_PROPERTY, kind: "rich_text" };

const THE_EVENT: SectionSpec = {
  title: "The event",
  blurb: "What are we running? Everything else hangs off this.",
  color: "orange",
};

const THE_PARTS: SectionSpec = {
  title: "The moving parts",
  blurb: "Rooms, kit, people, and audience — the things a change can disturb.",
  color: "blue",
};

const THE_RUN: SectionSpec = {
  title: "The run of show",
  blurb: "Each slot on the timetable, with everything it depends on attached.",
  color: "green",
};

const THE_FOLLOW_THROUGH: SectionSpec = {
  title: "Change & follow-through",
  blurb: "What changed, who approved it, and the work it created.",
  color: "red",
};

/**
 * Ordered so relations can be created: a relation needs its target database to
 * exist. Events and Equipment have no relations and come first; Venues relate to
 * Equipment; Sessions relate to everything above; Tasks relate to Sessions and
 * the Change Log. The order also groups the home page into readable sections.
 */
export const NOTION_SCHEMA: DatabaseSpec[] = [
  {
    key: "events",
    title: "Events",
    icon: "🎟️",
    description: "The event itself — dates, status, and the record everything hangs off.",
    purpose: "One row per event. Sessions, changes, and tasks all point back here.",
    readGuide:
      "Read the Status pill first: grey is still on the calendar, yellow is actively being planned, green is happening now, blue is wrapped.",
    section: THE_EVENT,
    titleProperty: "Name",
    envVar: "NOTION_DB_EVENTS",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Date", kind: "date" },
      {
        name: "Status",
        kind: "select",
        options: [...STATUS_OPTIONS],
        optionColors: STATUS_COLORS,
      },
    ],
  },
  {
    key: "equipment",
    title: "Equipment",
    icon: "🎛️",
    description: "Every item we can move, and whether it is free to use.",
    purpose: "Availability lives here, so a change can tell you what is already taken.",
    readGuide:
      "Status is the column that matters — green is free, yellow is out on another session, red is in maintenance and cannot be moved by anyone.",
    section: THE_PARTS,
    titleProperty: "Name",
    envVar: "NOTION_DB_EQUIPMENT",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Type", kind: "rich_text" },
      {
        name: "Status",
        kind: "select",
        options: [...EQUIPMENT_STATUS_OPTIONS],
        optionColors: EQUIPMENT_STATUS_COLORS,
      },
    ],
  },
  {
    key: "venues",
    title: "Venues",
    icon: "🏛️",
    description: "Rooms, how many people they hold, and the kit already inside them.",
    purpose: "Capacity checks and room swaps both read this.",
    readGuide:
      "Capacity is pulled in automatically whenever a session is moved here. The Equipment column is what the room already holds.",
    section: THE_PARTS,
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
    key: "people",
    title: "People",
    icon: "👥",
    description: "Who is on the team, what they are good at, and the roles they hold.",
    purpose: "Follow-ups are owned by a role, then handed to a person here.",
    readGuide:
      "Roles are colour-coded. Work is owned by a role first and handed to a named person after that, so nothing sits unowned between shifts.",
    section: THE_PARTS,
    titleProperty: "Name",
    envVar: "NOTION_DB_PEOPLE",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      {
        name: "Roles",
        kind: "multi_select",
        options: [...ROLE_OPTIONS],
        optionColors: ROLE_COLORS,
      },
      { name: "Skills", kind: "rich_text" },
    ],
  },
  {
    key: "groups",
    title: "Participant Groups",
    icon: "🎫",
    description: "Groups of attendees, and how many of them are coming.",
    purpose: "Sizes feed capacity warnings and who needs to be told about a change.",
    readGuide:
      "Size is what the capacity check adds up. Any group listed on a session counts as invited to it, and gets told when that session changes.",
    section: THE_PARTS,
    titleProperty: "Name",
    envVar: "NOTION_DB_GROUPS",
    properties: [
      { name: "Name", kind: "title" },
      domainId,
      { name: "Size", kind: "number" },
    ],
  },
  {
    key: "sessions",
    title: "Sessions",
    icon: "🗓️",
    description: "The timetable: what runs, when, where, with which kit and people.",
    purpose: "A change almost always lands on a session. This is where impact starts.",
    readGuide:
      "Start here when something moves. The relations on the right — Venue, Required Equipment, Assigned People, Participant Groups — are the links the software follows to find everything else.",
    section: THE_RUN,
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
    icon: "🔁",
    description: "Every approved change — what moved, why, and what it touched.",
    purpose: "The audit trail. It is also what the post-event report is built from.",
    readGuide:
      "Type is colour-coded by what moved. Conflicts stores what the rules found at preview time, which is why the post-event report can be trusted later.",
    section: THE_FOLLOW_THROUGH,
    titleProperty: "Id",
    envVar: "NOTION_DB_CHANGELOG",
    properties: [
      { name: "Id", kind: "title" },
      domainId,
      {
        name: "Type",
        kind: "select",
        options: [...CHANGE_TYPE_OPTIONS],
        optionColors: CHANGE_TYPE_COLORS,
      },
      { name: "Change", kind: "rich_text" },
      { name: "Event", kind: "relation", relatesTo: "events" },
      { name: "Session", kind: "relation", relatesTo: "sessions" },
      { name: "From Venue", kind: "relation", relatesTo: "venues" },
      { name: "To Venue", kind: "relation", relatesTo: "venues" },
      { name: "Reason", kind: "rich_text" },
      { name: "Affected Records", kind: "rich_text" },
      { name: "Follow-up Task IDs", kind: "rich_text" },
      { name: "Conflicts", kind: "rich_text" },
      {
        name: "Approved By",
        kind: "select",
        options: [...ROLE_OPTIONS],
        optionColors: ROLE_COLORS,
      },
      { name: "Summary", kind: "rich_text" },
      { name: "Created", kind: "date" },
    ],
  },
  {
    key: "tasks",
    title: "Tasks",
    icon: "✅",
    description: "The follow-up work a change creates, owned by a role, with a deadline.",
    purpose: "This is what each role opens on the day. Status colours tell you what is stuck.",
    readGuide:
      "Owner Role is who does it, Status is how far it has got (red means blocked), and Source Change links back to the decision that created it.",
    section: THE_FOLLOW_THROUGH,
    titleProperty: "Title",
    envVar: "NOTION_DB_TASKS",
    properties: [
      { name: "Title", kind: "title" },
      domainId,
      {
        name: "Owner Role",
        kind: "select",
        options: [...ROLE_OPTIONS],
        optionColors: ROLE_COLORS,
      },
      { name: "Owner", kind: "relation", relatesTo: "people" },
      { name: "Session", kind: "relation", relatesTo: "sessions" },
      {
        name: "Status",
        kind: "select",
        options: [...TASK_STATUS_OPTIONS],
        optionColors: TASK_STATUS_COLORS,
      },
      { name: "Due", kind: "date" },
      { name: "Source Change", kind: "relation", relatesTo: "changeLog" },
    ],
  },
];

/** The home page's sections, in the order their databases appear. */
export function schemaSections(): SectionSpec[] {
  const seen: SectionSpec[] = [];
  for (const spec of NOTION_SCHEMA) {
    if (!seen.includes(spec.section)) seen.push(spec.section);
  }
  return seen;
}

export function databaseSpec(key: DatabaseKey): DatabaseSpec {
  const spec = NOTION_SCHEMA.find((item) => item.key === key);
  if (!spec) throw new Error(`Unknown database key: ${key}`);
  return spec;
}
