import type { Conflict, EventGraph, Person, Role } from "@/lib/domain/types";
import { byId } from "../graph";
import type { Rule, RuleContext } from "./types";

/** Roles a session needs someone to hold. */
export function neededRoles(): Role[] {
  return ["logistics", "volunteer_coordinator"];
}

function rolesOf(graph: EventGraph, personIds: string[]): Set<Role> {
  const people = byId(graph.people);
  const roles = new Set<Role>();
  for (const id of personIds) {
    for (const role of people.get(id)?.roles ?? []) roles.add(role);
  }
  return roles;
}

/**
 * Phase 4 candidate proposals: people who hold the role and are not already on
 * the session, ranked by how few other sessions they carry. Proposed, never
 * applied: a human approves.
 */
export function candidatesFor(
  graph: EventGraph,
  role: Role,
  sessionId: string,
): Person[] {
  const load = new Map<string, number>();
  for (const session of graph.sessions) {
    if (session.id === sessionId) continue;
    for (const personId of session.assignedPersonIds) {
      load.set(personId, (load.get(personId) ?? 0) + 1);
    }
  }
  const session = graph.sessions.find((item) => item.id === sessionId);
  const already = new Set(session?.assignedPersonIds ?? []);

  return graph.people
    .filter((person) => person.roles.includes(role) && !already.has(person.id))
    .sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0));
}

/** A venue change that leaves a role unowned is a quiet risk. */
export const coverageGapRule: Rule = {
  id: "coverage-gap",
  appliesTo: ["venue_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const roles = rolesOf(graph, proposed.assignedPersonIds);
    if (roles.has("logistics")) return [];
    return [
      {
        id: `conf-coverage-${proposed.id}`,
        severity: "info",
        kind: "coverage_gap",
        ownerRole: "volunteer_coordinator",
        message: `No logistics owner is assigned to "${proposed.title}"; move coordination is unowned.`,
        recordIds: [proposed.id, ...proposed.assignedPersonIds],
      },
    ];
  },
};

/** Removing the last holder of a needed role is blocking. */
export const unassignedRoleRule: Rule = {
  id: "unassigned-role",
  appliesTo: ["person_change"],
  evaluate({ graph, proposed }: RuleContext): Conflict[] {
    const roles = rolesOf(graph, proposed.assignedPersonIds);
    const missing = neededRoles().filter((role) => !roles.has(role));
    if (missing.length === 0) return [];
    return [
      {
        id: `conf-unassigned-${proposed.id}`,
        severity: "blocking",
        kind: "unassigned_role",
        ownerRole: "volunteer_coordinator",
        message: `"${proposed.title}" would have no owner for: ${missing.join(", ")}.`,
        recordIds: [proposed.id, ...proposed.assignedPersonIds],
      },
    ];
  },
};

/** People added who carry none of the roles this session needs. */
export const skillGapRule: Rule = {
  id: "skill-gap",
  appliesTo: ["person_change"],
  evaluate({ graph, change, proposed }: RuleContext): Conflict[] {
    if (change.changeType !== "person_change" || change.addPersonIds.length === 0) {
      return [];
    }
    const people = byId(graph.people);
    const needed = neededRoles();
    const misfits = change.addPersonIds
      .map((id) => people.get(id))
      .filter((person): person is Person => Boolean(person))
      .filter((person) => !person.roles.some((role) => needed.includes(role)));
    if (misfits.length === 0) return [];
    return [
      {
        id: `conf-skill-gap-${proposed.id}`,
        severity: "warning",
        kind: "skill_gap",
        ownerRole: "volunteer_coordinator",
        message: `These people hold none of the roles "${proposed.title}" needs: ${misfits
          .map((person) => person.name)
          .join(", ")}.`,
        recordIds: [proposed.id, ...misfits.map((person) => person.id)],
      },
    ];
  },
};
