/**
 * Human-readable formatting. Everything a person reads goes through here, so
 * the screens never leak a raw relation key, entity name, or ISO timestamp.
 */

const IST = "Asia/Kolkata";

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: IST,
  }).format(date);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatLongDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/**
 * "in 3 days" / "today" / "2 days ago", measured against the event's own date so
 * the dashboard reads like a briefing rather than a timestamp dump.
 */
export function daysUntil(targetIso: string, from: Date = new Date()): number | null {
  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return null;
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end - start) / 86_400_000);
}

export function countdownLabel(targetIso: string, from: Date = new Date()): string {
  const days = daysUntil(targetIso, from);
  if (days === null) return "date unknown";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "yesterday";
  return `${Math.abs(days)} days ago`;
}

export function roleLabel(role: string): string {
  return titleCaseWords(role.replace(/_/g, " "));
}

/** What each role actually does, in the words a person would use. */
export const ROLE_BLURBS: Record<string, string> = {
  organizer: "Owns the run of show, capacity, and any clash between sessions.",
  logistics: "Moves equipment, clears maintenance blocks, keeps kit available.",
  volunteer_coordinator: "Re-briefs people and refills roles that just emptied.",
  communications: "Tells the audience what changed, before they find out on the day.",
  leadership: "Watches escalation risk across the whole event.",
};

/** One short line per role, for compact cards. */
export const ROLE_TAGLINES: Record<string, string> = {
  organizer: "the run of show",
  logistics: "kit and rooms",
  volunteer_coordinator: "people and briefings",
  communications: "the audience",
  leadership: "escalation risk",
};

export function titleCaseWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function titleCase(value: string): string {
  return titleCaseWords(value.replace(/_/g, " "));
}

/** Pluralise without a library: plural(1, "task") → "1 task". */
export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

const ENTITY_LABELS: Record<string, string> = {
  sessions: "Session",
  venues: "Venue",
  equipment: "Equipment",
  people: "Person",
  participantGroups: "Participant group",
  tasks: "Task",
  events: "Event",
  changeLog: "Change",
};

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? titleCase(entity);
}

/** Why a record appears in the blast radius — in plain language. */
const RELATION_LABELS: Record<string, string> = {
  changed_record: "the session that changed",
  required_by_session: "needed by this session",
  assigned_to_session: "working this session",
  invited_to_session: "invited to this session",
  follows_session: "work tied to this session",
  receiving_venue: "the room it moves into",
  current_venue: "the room it leaves",
};

export function relationLabel(relation: string): string {
  return RELATION_LABELS[relation] ?? titleCase(relation);
}

export function severityLabel(severity: string): string {
  if (severity === "blocking") return "Blocks the plan";
  if (severity === "warning") return "Needs a decision";
  return "Worth knowing";
}

export function taskStatusLabel(status: string): string {
  if (status === "todo") return "To do";
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Done";
  if (status === "blocked") return "Blocked";
  return titleCase(status);
}
