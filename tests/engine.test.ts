import { describe, expect, test } from "bun:test";
import type { EventGraph } from "@/lib/domain/types";
import seed from "../data/seed/event-graph.json";
import { computeImpact } from "@/lib/engine/impact";
import { applyChange } from "@/lib/engine/apply";

const graph = structuredClone(seed) as unknown as EventGraph;

const auditoriumChange = {
  changeType: "venue_change" as const,
  eventId: "evt-1",
  sessionId: "ses-keynote",
  newVenueId: "ven-hall-b",
  reason: "Roof leak reported in the Main Auditorium.",
};

describe("computeImpact", () => {
  const report = computeImpact(graph, auditoriumChange);

  test("traverses the graph to connected records", () => {
    const ids = report.affected.map((record) => record.id);
    expect(ids).toContain("ses-keynote");
    expect(ids).toContain("ven-main");
    expect(ids).toContain("ven-hall-b");
    expect(ids).toContain("eq-stage-lights");
    expect(ids).toContain("pg-all");
    expect(ids).toContain("tsk-1");
  });

  test("flags capacity and missing equipment as blocking", () => {
    const kinds = report.conflicts.map((conflict) => conflict.kind);
    expect(kinds).toContain("capacity_exceeded");
    expect(kinds).toContain("equipment_missing");
    const blocking = report.conflicts.filter((c) => c.severity === "blocking");
    expect(blocking.length).toBeGreaterThanOrEqual(2);
  });

  test("every conflict cites the records it read", () => {
    for (const conflict of report.conflicts) {
      expect(conflict.recordIds.length).toBeGreaterThan(0);
    }
  });

  test("proposes follow-ups owned by the right roles", () => {
    const owners = new Set(report.followUps.map((followUp) => followUp.ownerRole));
    expect(owners).toContain("organizer");
    expect(owners).toContain("logistics");
    expect(owners).toContain("communications");
    expect(owners).toContain("volunteer_coordinator");
    expect(owners).toContain("leadership");
  });

  test("summary is labeled generated and never claims an LLM call", () => {
    expect(report.summary.generated).toBe(true);
    expect(report.summary.generator.toLowerCase()).toContain("not an llm");
    expect(report.summary.sourceRecordIds).toContain("ses-keynote");
  });
});

describe("applyChange", () => {
  test("moves the session, adds tasks, and appends a linked change log", () => {
    const { graph: next, entry } = applyChange(
      graph,
      auditoriumChange,
      "organizer",
    );

    const moved = next.sessions.find((session) => session.id === "ses-keynote");
    expect(moved?.venueId).toBe("ven-hall-b");

    expect(next.tasks.length).toBeGreaterThan(graph.tasks.length);
    expect(entry.followUpTaskIds.length).toBeGreaterThan(0);
    expect(entry.approvedByRole).toBe("organizer");
    expect(next.changeLog).toHaveLength(graph.changeLog.length + 1);

    const created = next.tasks.filter((task) => task.sourceChangeId === entry.id);
    expect(created.map((task) => task.id)).toEqual(entry.followUpTaskIds);
  });

  test("applies only the selected follow-ups", () => {
    const report = computeImpact(graph, auditoriumChange);
    const chosen = report.followUps[0].id;
    const { graph: next, entry } = applyChange(graph, auditoriumChange, "organizer", {
      selectedFollowUpIds: [chosen],
    });
    expect(entry.followUpTaskIds).toHaveLength(1);
    expect(next.tasks.filter((task) => task.sourceChangeId === entry.id)).toHaveLength(1);
  });
});

describe("clean change", () => {
  test("a venue with enough seats and equipment produces no blocking conflicts", () => {
    const clean: EventGraph = {
      events: [
        { id: "evt-x", name: "Test", date: "2026-01-01", status: "planned" },
      ],
      venues: [
        { id: "v-a", name: "A", capacity: 10, equipmentIds: [] },
        { id: "v-b", name: "B", capacity: 200, equipmentIds: ["eq-1"] },
      ],
      equipment: [
        { id: "eq-1", name: "Thing", type: "audio", status: "available" },
      ],
      sessions: [
        {
          id: "s-1",
          eventId: "evt-x",
          title: "Talk",
          startTime: "2026-01-01T10:00:00Z",
          endTime: "2026-01-01T11:00:00Z",
          venueId: "v-a",
          requiredEquipmentIds: ["eq-1"],
          assignedPersonIds: [],
          participantGroupIds: ["g-1"],
        },
      ],
      people: [],
      participantGroups: [{ id: "g-1", name: "Everyone", size: 5 }],
      tasks: [
        {
          id: "t-comms",
          title: "Notify everyone",
          ownerRole: "communications",
          sessionId: "s-1",
          status: "todo",
          dueAt: "2026-01-01T08:00:00Z",
        },
      ],
      changeLog: [],
    };

    const report = computeImpact(clean, {
      changeType: "venue_change",
      eventId: "evt-x",
      sessionId: "s-1",
      newVenueId: "v-b",
    });

    const blocking = report.conflicts.filter((c) => c.severity === "blocking");
    expect(blocking).toHaveLength(0);
  });
});
