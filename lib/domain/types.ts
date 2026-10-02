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
  fromVenueId: string;
  toVenueId: string;
  reason?: string;
  affectedRecordIds: string[];
  followUpTaskIds: string[];
  approvedByRole: Role;
  summary: string;
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

/** MVP supports one change type end to end, then widens if time remains. */
export type ChangeType = "venue_change";

export interface ChangeRequest {
  changeType: ChangeType;
  eventId: string;
  sessionId: string;
  newVenueId: string;
  reason?: string;
}

export interface AffectedRecord {
  id: string;
  entity: keyof EventGraph;
  label: string;
  /** How this record connects to the changed session. */
  relation: string;
}

export type ConflictSeverity = "blocking" | "warning" | "info";

export interface Conflict {
  id: string;
  severity: ConflictSeverity;
  kind: string;
  message: string;
  recordIds: string[];
}

export interface ProposedFollowUp {
  id: string;
  title: string;
  ownerRole: Role;
  ownerPersonId?: string;
  dueAt: string;
  reason: string;
  relatedRecordIds: string[];
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
  fromVenueId: string;
  affected: AffectedRecord[];
  conflicts: Conflict[];
  followUps: ProposedFollowUp[];
  summary: GeneratedSummary;
}
