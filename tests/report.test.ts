import { describe, expect, test } from "bun:test";
import type { EventGraph } from "@/lib/domain/types";
import seed from "../data/seed/event-graph.json";
import { applyChange } from "@/lib/engine/apply";
import { buildReport } from "@/lib/engine/report";

const graph = structuredClone(seed) as unknown as EventGraph;

const change = {
  changeType: "venue_change" as const,
  eventId: "evt-1",
  sessionId: "ses-keynote",
  newVenueId: "ven-hall-b",
  reason: "Roof leak reported in the Main Auditorium.",
};

describe("buildReport", () => {
  test("an event with no recorded changes reports that clearly", () => {
    const report = buildReport(graph, "evt-1");
    expect(report.changes).toHaveLength(0);
    expect(report.lessons).toHaveLength(0);
    expect(report.generated).toBe(true);
  });

  test("records the applied change with its conflicts", () => {
    const { graph: next } = applyChange(graph, change, "organizer");
    const report = buildReport(next, "evt-1");

    expect(report.changes).toHaveLength(1);
    expect(report.changes[0].id).toBe("chg-001");
    expect(report.changes[0].conflicts?.length).toBeGreaterThan(0);
  });

  test("derives one lesson per conflict category, each linked to records", () => {
    const { graph: next } = applyChange(graph, change, "organizer");
    const report = buildReport(next, "evt-1");

    expect(report.lessons.length).toBeGreaterThanOrEqual(3);
    for (const lesson of report.lessons) {
      expect(lesson.text.length).toBeGreaterThan(0);
      expect(lesson.sourceRecordIds.length).toBeGreaterThan(0);
      expect(lesson.occurrences).toBeGreaterThan(0);
    }
    expect(report.lessons.map((lesson) => lesson.id)).toContain(
      "lesson-capacity_exceeded",
    );
  });

  test("report is labeled generated and never claims an LLM call", () => {
    const { graph: next } = applyChange(graph, change, "organizer");
    const report = buildReport(next, "evt-1");
    expect(report.generator.toLowerCase()).toContain("not an llm");
    expect(report.sourceRecordIds).toContain("evt-1");
  });
});
