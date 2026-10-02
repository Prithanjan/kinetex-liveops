import { describe, expect, test } from "bun:test";
import type { NotionPageLike } from "@/lib/data/notion/mapping";
import {
  changeLogToProperties,
  pageDomainId,
  pageToChangeLogEntry,
  pageToEvent,
  pageToSession,
  pageToVenue,
  taskToProperties,
} from "@/lib/data/notion/mapping";
import type { ChangeLogEntry, Task, Venue } from "@/lib/domain/types";

function text(value: string) {
  return [{ plain_text: value }];
}

const eventPage: NotionPageLike = {
  id: "page-evt",
  properties: {
    Name: { title: text("Kinetex Summit 2026") },
    "Domain ID": { rich_text: text("evt-1") },
    Date: { date: { start: "2026-10-05" } },
    Status: { select: { name: "in_planning" } },
  },
};

const venuePage: NotionPageLike = {
  id: "page-ven",
  properties: {
    Name: { title: text("Hall B") },
    "Domain ID": { rich_text: text("ven-hall-b") },
    Capacity: { number: 120 },
    Equipment: { relation: [{ id: "page-eq-1" }, { id: "page-eq-2" }] },
  },
};

const sessionPage: NotionPageLike = {
  id: "page-ses",
  properties: {
    Title: { title: text("Opening Keynote") },
    "Domain ID": { rich_text: text("ses-keynote") },
    Event: { relation: [{ id: "page-evt" }] },
    Start: { date: { start: "2026-10-05T09:00:00+05:30" } },
    End: { date: { start: "2026-10-05T10:30:00+05:30" } },
    Venue: { relation: [{ id: "page-ven" }] },
    "Required Equipment": { relation: [{ id: "page-eq-1" }] },
    "Assigned People": { relation: [{ id: "page-per-1" }] },
    "Participant Groups": { relation: [{ id: "page-grp-1" }] },
  },
};

describe("page to entity", () => {
  test("reads a domain id stamped on the page", () => {
    expect(pageDomainId(eventPage)).toBe("evt-1");
  });

  test("maps an event", () => {
    expect(pageToEvent(eventPage)).toEqual({
      id: "evt-1",
      name: "Kinetex Summit 2026",
      date: "2026-10-05",
      status: "in_planning",
    });
  });

  test("maps a venue with raw relation page ids", () => {
    const venue = pageToVenue(venuePage);
    expect(venue.capacity).toBe(120);
    expect(venue.equipmentIds).toEqual(["page-eq-1", "page-eq-2"]);
  });

  test("maps a session and translates relation page ids to domain ids", () => {
    const session = pageToSession(
      sessionPage,
      new Map([["page-eq-1", "eq-projector-hd"]]),
      new Map([["page-per-1", "per-1"]]),
      new Map([["page-grp-1", "pg-all"]]),
      new Map([["page-ven", "ven-main"]]),
      new Map([["page-evt", "evt-1"]]),
    );
    expect(session.id).toBe("ses-keynote");
    expect(session.eventId).toBe("evt-1");
    expect(session.venueId).toBe("ven-main");
    expect(session.requiredEquipmentIds).toEqual(["eq-projector-hd"]);
    expect(session.assignedPersonIds).toEqual(["per-1"]);
    expect(session.participantGroupIds).toEqual(["pg-all"]);
  });
});

describe("entity to properties", () => {
  test("a task writes a resolvable relation and a domain id", () => {
    const task: Task = {
      id: "tsk-chg-001-fu-comms-ses-keynote",
      title: "Notify attendees",
      ownerRole: "communications",
      sessionId: "ses-keynote",
      status: "todo",
      dueAt: "2026-10-05T01:00:00.000Z",
      sourceChangeId: "chg-001",
    };

    const properties = taskToProperties(task, (key, domainId) =>
      key === "sessions" && domainId === "ses-keynote"
        ? "page-ses"
        : key === "changeLog" && domainId === "chg-001"
          ? "page-chg"
          : undefined,
    ) as Record<string, { relation?: { id: string }[]; select?: { name: string } }>;

    expect(properties["Owner Role"].select?.name).toBe("communications");
    expect(properties.Session.relation).toEqual([{ id: "page-ses" }]);
    expect(properties["Source Change"].relation).toEqual([{ id: "page-chg" }]);
    expect(properties.Owner.relation).toEqual([]);
  });

  test("an unresolvable relation is dropped, never written as a broken id", () => {
    const task: Task = {
      id: "t",
      title: "T",
      ownerRole: "organizer",
      status: "todo",
      dueAt: "2026-01-01T00:00:00Z",
      sessionId: "missing",
    };
    const properties = taskToProperties(task, () => undefined) as Record<string, {
      relation?: { id: string }[];
    }>;
    expect(properties.Session.relation).toEqual([]);
  });
});

describe("change log round trip", () => {
  test("conflicts survive a write and read", () => {
    const entry: ChangeLogEntry = {
      id: "chg-001",
      createdAt: "2026-10-02T10:00:00.000Z",
      changeType: "venue_change",
      eventId: "evt-1",
      sessionId: "ses-keynote",
      changeLabel: "Main Auditorium → Hall B",
      fromVenueId: "ven-main",
      toVenueId: "ven-hall-b",
      affectedRecordIds: ["ses-keynote", "ven-hall-b"],
      followUpTaskIds: ["tsk-chg-001-fu-comms-ses-keynote"],
      approvedByRole: "organizer",
      summary: "Moved.",
      conflicts: [
        {
          id: "conf-capacity-ses-keynote",
          severity: "blocking",
          kind: "capacity_exceeded",
          message: "Too small.",
          recordIds: ["ses-keynote", "ven-hall-b"],
        },
      ],
    };

    const properties = changeLogToProperties(entry, (key, domainId) =>
      `${key}:${domainId}`,
    ) as Record<string, { rich_text?: { text: { content: string } }[] }>;
    const conflictsRaw = properties.Conflicts.rich_text?.[0].text.content ?? "";
    expect(JSON.parse(conflictsRaw)).toHaveLength(1);

    const reread = pageToChangeLogEntry(
      {
        id: "page-chg",
        properties: {
          Id: { title: text("chg-001") },
          "Domain ID": { rich_text: text("chg-001") },
          Type: { select: { name: "venue_change" } },
          Reason: { rich_text: text("leak") },
          "Affected Records": { rich_text: text("ses-keynote,ven-hall-b") },
          "Follow-up Task IDs": { rich_text: text("tsk-1,tsk-2") },
          Conflicts: { rich_text: text(conflictsRaw) },
          "Approved By": { select: { name: "organizer" } },
          Summary: { rich_text: text("Moved.") },
          Created: { date: { start: "2026-10-02T10:00:00.000Z" } },
        },
      },
      new Map(),
      new Map(),
      new Map(),
    );

    expect(reread.id).toBe("chg-001");
    expect(reread.followUpTaskIds).toEqual(["tsk-1", "tsk-2"]);
    expect(reread.conflicts?.[0].kind).toBe("capacity_exceeded");
  });
});

describe("venue invariants", () => {
  test("capacity and equipment ids are preserved", () => {
    const venue: Venue = {
      id: "v",
      name: "V",
      capacity: 42,
      equipmentIds: ["e1"],
    };
    expect(venue.capacity).toBe(42);
    expect(venue.equipmentIds).toEqual(["e1"]);
  });
});
