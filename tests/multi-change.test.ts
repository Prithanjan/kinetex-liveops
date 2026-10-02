import { describe, expect, test } from "bun:test";
import type { EventGraph } from "@/lib/domain/types";
import seed from "../data/seed/event-graph.json";
import { computeImpact } from "@/lib/engine/impact";
import { applyChange } from "@/lib/engine/apply";
import { RULES, rulesFor } from "@/lib/engine/rules";

const graph = structuredClone(seed) as unknown as EventGraph;
const base = { eventId: "evt-1", sessionId: "ses-keynote" };

describe("rule registry", () => {
  test("every change type has at least one applicable rule", () => {
    expect(rulesFor("venue_change").length).toBeGreaterThan(0);
    expect(rulesFor("time_change").length).toBeGreaterThan(0);
    expect(rulesFor("resource_change").length).toBeGreaterThan(0);
    expect(rulesFor("person_change").length).toBeGreaterThan(0);
  });

  test("rule ids are unique", () => {
    const ids = RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("no rule applies to an empty set of change types", () => {
    for (const rule of RULES) expect(rule.appliesTo.length).toBeGreaterThan(0);
  });
});

describe("time change", () => {
  test("moving into an occupied slot reports a blocking overlap", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "time_change",
      newStart: "2026-10-05T11:00:00+05:30",
      newEnd: "2026-10-05T12:00:00+05:30",
    });
    const overlap = report.conflicts.find((c) => c.kind === "schedule_overlap");
    expect(overlap).toBeDefined();
    expect(overlap?.severity).toBe("blocking");
    expect(overlap?.recordIds).toContain("ses-panel");
  });

  test("reports a change label with the new time", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "time_change",
      newStart: "2026-10-05T11:00:00+05:30",
      newEnd: "2026-10-05T12:00:00+05:30",
    });
    expect(report.changeLabel).toContain("→");
  });

  test("applying a time change updates the session times", () => {
    const { graph: next } = applyChange(
      graph,
      {
        ...base,
        changeType: "time_change",
        newStart: "2026-10-05T13:00:00+05:30",
        newEnd: "2026-10-05T14:00:00+05:30",
      },
      "organizer",
    );
    const session = next.sessions.find((item) => item.id === "ses-keynote");
    expect(session?.startTime).toBe("2026-10-05T13:00:00+05:30");
    expect(session?.endTime).toBe("2026-10-05T14:00:00+05:30");
  });
});

describe("person change", () => {
  test("removing the last coordinator blocks on an unassigned role", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "person_change",
      addPersonIds: [],
      removePersonIds: ["per-2"],
    });
    const unassigned = report.conflicts.find((c) => c.kind === "unassigned_role");
    expect(unassigned).toBeDefined();
    expect(unassigned?.severity).toBe("blocking");
  });

  test("proposes candidate people without assigning them", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "person_change",
      addPersonIds: [],
      removePersonIds: ["per-2"],
    });
    const withCandidates = report.followUps.filter(
      (followUp) => (followUp.candidatePersonIds?.length ?? 0) > 0,
    );
    expect(withCandidates.length).toBeGreaterThan(0);
    // Candidates are proposals; no task is pre-assigned to a person.
    expect(withCandidates.every((f) => f.ownerPersonId === undefined)).toBe(true);
  });
});

describe("resource change", () => {
  test("removing equipment the session does not need reports nothing blocking", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "resource_change",
      addEquipmentIds: [],
      removeEquipmentIds: ["eq-stage-lights"],
    });
    const blocking = report.conflicts.filter((c) => c.severity === "blocking");
    expect(blocking).toHaveLength(0);
    expect(report.conflicts.some((c) => c.kind === "equipment_missing")).toBe(false);
  });

  test("adding maintenance equipment is blocking", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "resource_change",
      addEquipmentIds: ["eq-whiteboard"],
      removeEquipmentIds: [],
    });
    const maintenance = report.conflicts.find(
      (c) => c.kind === "maintenance_window",
    );
    expect(maintenance?.severity).toBe("blocking");
  });

  test("adding equipment from another room warns about transport", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "resource_change",
      addEquipmentIds: ["eq-pa-small"],
      removeEquipmentIds: [],
    });
    expect(report.conflicts.some((c) => c.kind === "transport_lead_time")).toBe(true);
  });
});

describe("venue change regression", () => {
  test("still reports capacity and missing equipment as blocking", () => {
    const report = computeImpact(graph, {
      ...base,
      changeType: "venue_change",
      newVenueId: "ven-hall-b",
      reason: "leak",
    });
    const kinds = report.conflicts.map((c) => c.kind);
    expect(kinds).toContain("capacity_exceeded");
    expect(kinds).toContain("equipment_missing");
    expect(report.affected.length).toBeGreaterThanOrEqual(10);
  });
});
