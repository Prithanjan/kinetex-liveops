import type {
  Equipment,
  EventGraph,
  ParticipantGroup,
  Person,
  Session,
  Task,
  Venue,
} from "@/lib/domain/types";

export function byId<T extends { id: string }>(records: T[]): Map<string, T> {
  return new Map(records.map((record) => [record.id, record]));
}

export interface GraphIndex {
  venues: Map<string, Venue>;
  equipment: Map<string, Equipment>;
  sessions: Map<string, Session>;
  people: Map<string, Person>;
  groups: Map<string, ParticipantGroup>;
  tasks: Map<string, Task>;
}

export function indexGraph(graph: EventGraph): GraphIndex {
  return {
    venues: byId(graph.venues),
    equipment: byId(graph.equipment),
    sessions: byId(graph.sessions),
    people: byId(graph.people),
    groups: byId(graph.participantGroups),
    tasks: byId(graph.tasks),
  };
}

export function tasksForSession(graph: EventGraph, sessionId: string): Task[] {
  return graph.tasks.filter((task) => task.sessionId === sessionId);
}

export function sessionsInVenue(graph: EventGraph, venueId: string): Session[] {
  return graph.sessions.filter((session) => session.venueId === venueId);
}

export function participantsForSession(
  graph: EventGraph,
  session: Session,
): ParticipantGroup[] {
  const groups = byId(graph.participantGroups);
  return session.participantGroupIds
    .map((id) => groups.get(id))
    .filter((group): group is ParticipantGroup => Boolean(group));
}

export function peopleForSession(graph: EventGraph, session: Session): Person[] {
  const people = byId(graph.people);
  return session.assignedPersonIds
    .map((id) => people.get(id))
    .filter((person): person is Person => Boolean(person));
}

export function requiredEquipment(
  graph: EventGraph,
  session: Session,
): Equipment[] {
  const equipment = byId(graph.equipment);
  return session.requiredEquipmentIds
    .map((id) => equipment.get(id))
    .filter((item): item is Equipment => Boolean(item));
}

export function overlaps(a: Session, b: Session): boolean {
  const aStart = Date.parse(a.startTime);
  const aEnd = Date.parse(a.endTime);
  const bStart = Date.parse(b.startTime);
  const bEnd = Date.parse(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/** ISO timestamp `hours` before a session starts, used for follow-up deadlines. */
export function hoursBefore(iso: string, hours: number): string {
  return new Date(Date.parse(iso) - hours * 60 * 60 * 1000).toISOString();
}
