/**
 * Kinetex LiveOps domain model.
 *
 * One event graph, one change-to-closure workflow:
 *   plan -> detect dependencies -> preview impact -> assign follow-ups
 *        -> approve and sync -> brief each role -> capture lessons
 *
 * Rules determine impact; the generated summary only explains it.
 * Source facts (Notion or seed) stay distinguishable from generated text.
 */

export type Role =
  | "organizer"
  | "logistics"
  | "volunteer_coordinator"
  | "communications"
  | "leadership";

export const ROLES: Role[] = [
  "organizer",
  "logistics",
  "volunteer_coordinator",
  "communications",
  "leadership",
];

export type EquipmentStatus = "available" | "in_use" | "maintenance";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type SessionStatus = "scheduled" | "rescheduled" | "cancelled";

export interface EventRecord {
  id: string;
  name: string;
  date: string;
  status: "planned" | "in_planning" | "live" | "closed";
}

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  equipmentIds: string[];
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: EquipmentStatus;
}

export interface Session {
  id: string;
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  venueId: string;
  requiredEquipmentIds: string[];
  assignedPersonIds: string[];
  participantGroupIds: string[];
}

export interface Person {
  id: string;
  name: string;
  roles: Role[];
  skills: string[];
}

export interface ParticipantGroup {
  id: string;
  name: string;
  size: number;
}

export interface Task {
  id: string;
  title: string;
  ownerRole: Role;
  ownerPersonId?: string;
  sessionId?: string;
  status: TaskStatus;
  dueAt: string;
  sourceChangeId?: string;
}

export interface ChangeLogEntry {
  id: string;
  createdAt: string;
  changeType: ChangeType;
  eventId: string;
  sessionId: string;
  /** Human readable summary of what changed, e.g. "Main Auditorium → Hall B". */
  changeLabel: string;
  /** Present only for venue changes. */
  fromVenueId?: string;
  toVenueId?: string;
  reason?: string;
  affectedRecordIds: string[];
  followUpTaskIds: string[];
  approvedByRole: Role;
  summary: string;
  /**
   * Conflicts found at preview time, persisted so the post-event report can
   * derive lessons from what was actually detected, not a re-computation.
   * Optional so older entries stay valid.
   */
  conflicts?: Conflict[];
}

/** The full working set. Notion holds the same entities as pages/databases. */
export interface EventGraph {
  events: EventRecord[];
  venues: Venue[];
  equipment: Equipment[];
  sessions: Session[];
  people: Person[];
  participantGroups: ParticipantGroup[];
  tasks: Task[];
  changeLog: ChangeLogEntry[];
}

// ── Change model ───────────────────────────────────────────────────────────

export type ChangeType =
  | "venue_change"
  | "time_change"
  | "resource_change"
  | "person_change";

export const CHANGE_TYPES: ChangeType[] = [
  "venue_change",
  "time_change",
  "resource_change",
  "person_change",
];

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  venue_change: "Venue change",
  time_change: "Time change",
  resource_change: "Resource change",
  person_change: "Person change",
};

interface ChangeBase {
  eventId: string;
  sessionId: string;
  reason?: string;
}

export interface VenueChange extends ChangeBase {
  changeType: "venue_change";
  newVenueId: string;
}

export interface TimeChange extends ChangeBase {
  changeType: "time_change";
  newStart: string;
  newEnd: string;
}

export interface ResourceChange extends ChangeBase {
  changeType: "resource_change";
  addEquipmentIds: string[];
  removeEquipmentIds: string[];
}

export interface PersonChange extends ChangeBase {
  changeType: "person_change";
  addPersonIds: string[];
  removePersonIds: string[];
}

/** A discriminated union: optional fields on one wide type is the bug shape. */
export type ChangeRequest =
  | VenueChange
  | TimeChange
  | ResourceChange
  | PersonChange;

// ── Impact ─────────────────────────────────────────────────────────────────

export interface AffectedRecord {
  id: string;
  entity: keyof EventGraph;
  label: string;
  /** How this record connects to the changed record. */
  relation: string;
}

export type ConflictSeverity = "blocking" | "warning" | "info";

export interface Conflict {
  id: string;
  severity: ConflictSeverity;
  kind: string;
  message: string;
  recordIds: string[];
  /** Role that should own the fix, if the rule knows one. */
  ownerRole?: Role;
}

export interface ProposedFollowUp {
  id: string;
  title: string;
  ownerRole: Role;
  ownerPersonId?: string;
  dueAt: string;
  reason: string;
  relatedRecordIds: string[];
  /** Optional named candidates, proposed for a human to accept. Never applied. */
  candidatePersonIds?: string[];
}

/**
 * Generated text is always labeled and links its source facts.
 * `generator` names exactly how it was produced, so we never imply an
 * LLM call that did not happen (Measured-or-Placeholder rule).
 */
export interface GeneratedSummary {
  text: string;
  generated: true;
  generator: string;
  sourceRecordIds: string[];
}

export interface ImpactReport {
  change: ChangeRequest;
  /** Human readable "what will change" line. */
  changeLabel: string;
  affected: AffectedRecord[];
  conflicts: Conflict[];
  followUps: ProposedFollowUp[];
  summary: GeneratedSummary;
}
