"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ChangeLogEntry,
  ChangeRequest,
  ChangeType,
  EventGraph,
  ImpactReport,
  Role,
} from "@/lib/domain/types";
import { CHANGE_TYPES, ROLES } from "@/lib/domain/types";
import {
  count,
  entityLabel,
  formatDateTime,
  relationLabel,
  roleLabel,
  ROLE_BLURBS,
  severityLabel,
  titleCase,
} from "@/lib/format";
import { Callout, Card, CardBody, Chip, SectionTitle, toneFor } from "@/components/ui";
import { BlastRadius, type BlastNode } from "@/components/charts";
import {
  IconAlert,
  IconArrow,
  IconBox,
  IconCheck,
  IconClock,
  IconInfo,
  IconPin,
  IconSparkle,
  IconUsers,
  IconWarn,
} from "@/components/icons";

const IST = "Asia/Kolkata";

function toLocalInput(iso: string): string {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return formatted.replace(" ", "T");
}

function fromLocalInput(value: string): string {
  return `${value}:00+05:30`;
}

/** Cards, not a dropdown: what a person is about to change should be obvious. */
const CHANGE_CARDS: {
  type: ChangeType;
  icon: (props: { className?: string }) => React.ReactElement;
  blurb: string;
}[] = [
  {
    type: "venue_change",
    icon: IconPin,
    blurb: "A session moves to a different room.",
  },
  {
    type: "time_change",
    icon: IconClock,
    blurb: "A session starts later, or runs longer.",
  },
  {
    type: "resource_change",
    icon: IconBox,
    blurb: "Kit is added to a session, or taken away.",
  },
  {
    type: "person_change",
    icon: IconUsers,
    blurb: "Someone joins the crew, or has to step back.",
  },
];

/** Short labels for the blast-radius graph: what kind of thing is this. */
const ENTITY_KIND: Record<string, string> = {
  sessions: "Session",
  venues: "Venue",
  equipment: "Kit",
  people: "Crew",
  participantGroups: "Guests",
  tasks: "Task",
  events: "Event",
  changeLog: "Change",
};

const ENTITY_TONE: Record<string, BlastNode["tone"]> = {
  sessions: "accent",
  venues: "slate",
  equipment: "ochre",
  people: "plum",
  participantGroups: "moss",
  tasks: "clay",
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";
const labelClass = "block text-xs font-semibold uppercase tracking-[0.12em] text-faint";

export default function ChangeConsole({
  graph,
  sourceKind,
}: {
  graph: EventGraph;
  sourceKind: string;
}) {
  const router = useRouter();
  const [changeType, setChangeType] = useState<ChangeType>("venue_change");
  const [sessionId, setSessionId] = useState(graph.sessions[0]?.id ?? "");
  const [newVenueId, setNewVenueId] = useState(graph.venues[1]?.id ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [addEquipmentIds, setAddEquipmentIds] = useState<string[]>([]);
  const [removeEquipmentIds, setRemoveEquipmentIds] = useState<string[]>([]);
  const [addPersonIds, setAddPersonIds] = useState<string[]>([]);
  const [removePersonIds, setRemovePersonIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [approvedByRole, setApprovedByRole] = useState<Role>("organizer");
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [entry, setEntry] = useState<ChangeLogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const session = useMemo(
    () => graph.sessions.find((item) => item.id === sessionId),
    [graph.sessions, sessionId],
  );

  useEffect(() => {
    if (!session) return;
    setStart(toLocalInput(session.startTime));
    setEnd(toLocalInput(session.endTime));
    setAddEquipmentIds([]);
    setRemoveEquipmentIds([]);
    setAddPersonIds([]);
    setRemovePersonIds([]);
    setReport(null);
    setEntry(null);
    setError(null);
  }, [session]);

  function resetPreview() {
    setReport(null);
    setEntry(null);
    setError(null);
  }

  function buildChange(): ChangeRequest {
    const base = { eventId: session?.eventId ?? graph.events[0]?.id ?? "", sessionId };
    const trimmedReason = reason.trim() || undefined;
    switch (changeType) {
      case "venue_change":
        return { ...base, changeType, newVenueId, reason: trimmedReason };
      case "time_change":
        return {
          ...base,
          changeType,
          newStart: fromLocalInput(start),
          newEnd: fromLocalInput(end),
          reason: trimmedReason,
        };
      case "resource_change":
        return {
          ...base,
          changeType,
          addEquipmentIds,
          removeEquipmentIds,
          reason: trimmedReason,
        };
      case "person_change":
        return {
          ...base,
          changeType,
          addPersonIds,
          removePersonIds,
          reason: trimmedReason,
        };
    }
  }

  async function preview() {
    setBusy(true);
    setError(null);
    setEntry(null);
    try {
      const response = await fetch("/api/change/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildChange()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Preview failed.");
      const next = data.report as ImpactReport;
      setReport(next);
      setSelected(next.followUps.map((followUp) => followUp.id));
      document.getElementById("impact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Preview failed.");
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/change/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          change: buildChange(),
          approvedByRole,
          selectedFollowUpIds: selected,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Apply failed.");
      setEntry(data.entry as ChangeLogEntry);
      setReport(data.report as ImpactReport);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Apply failed.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(list: string[], setList: (next: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
    resetPreview();
  }

  const personName = (id: string) => graph.people.find((person) => person.id === id)?.name ?? id;
  const equipmentName = (id: string) =>
    graph.equipment.find((item) => item.id === id)?.name ?? id;

  const blastNodes: BlastNode[] =
    report?.affected.map((record) => ({
      label: record.label,
      kind: ENTITY_KIND[record.entity] ?? entityLabel(record.entity),
      tone: ENTITY_TONE[record.entity] ?? "slate",
    })) ?? [];

  const followUpsByRole = ROLES.map((role) => ({
    role,
    items: report?.followUps.filter((followUp) => followUp.ownerRole === role) ?? [],
  })).filter((group) => group.items.length > 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[21rem_1fr] lg:items-start">
      {/* ── The request ─────────────────────────────────────────────────── */}
      <Card className="lg:sticky lg:top-24">
        <CardBody>
          <SectionTitle
            icon={<IconSparkle className="h-5 w-5" />}
          >
            What changed?
          </SectionTitle>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {CHANGE_CARDS.map(({ type, icon: Icon, blurb }) => {
              const active = type === changeType;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setChangeType(type);
                    resetPreview();
                  }}
                  aria-pressed={active}
                  className={`rounded-card border p-3 text-left transition-all ${
                    active
                      ? "border-accent/40 bg-accent-soft shadow-[var(--shadow-card)]"
                      : "border-line bg-surface hover:border-accent/25 hover:bg-surface-sunk"
                  }`}
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                      active
                        ? "border-accent/25 bg-surface text-accent"
                        : "border-line bg-paper-deep text-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="mt-2.5 block text-sm font-semibold text-ink">
                    {titleCase(type)}
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted">
                    {blurb}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-6 block">
            <span className={labelClass}>Which session?</span>
            <select
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              className={fieldClass}
            >
              {graph.sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          {changeType === "venue_change" && (
            <label className="mt-4 block">
              <span className={labelClass}>Move it to</span>
              <select
                value={newVenueId}
                onChange={(event) => {
                  setNewVenueId(event.target.value);
                  resetPreview();
                }}
                className={fieldClass}
              >
                {graph.venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} — {venue.capacity} seats
                  </option>
                ))}
              </select>
            </label>
          )}

          {changeType === "time_change" && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Starts</span>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(event) => {
                    setStart(event.target.value);
                    resetPreview();
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Ends</span>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(event) => {
                    setEnd(event.target.value);
                    resetPreview();
                  }}
                  className={fieldClass}
                />
              </label>
            </div>
          )}

          {changeType === "resource_change" && (
            <div className="mt-4 space-y-4">
              <div>
                <span className={labelClass}>Bring in</span>
                <div className="mt-2 space-y-1.5">
                  {graph.equipment.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2.5 text-sm text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        checked={addEquipmentIds.includes(item.id)}
                        onChange={() => toggle(addEquipmentIds, setAddEquipmentIds, item.id)}
                        className="accent-accent"
                      />
                      <span>{item.name}</span>
                      <span
                        className={`ml-auto text-xs ${
                          item.status === "maintenance" ? "text-clay" : "text-faint"
                        }`}
                      >
                        {item.status === "maintenance" ? "in maintenance" : item.status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className={labelClass}>Take out</span>
                <div className="mt-2 space-y-1.5">
                  {(session?.requiredEquipmentIds ?? []).map((id) => (
                    <label
                      key={id}
                      className="flex items-center gap-2.5 text-sm text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        checked={removeEquipmentIds.includes(id)}
                        onChange={() =>
                          toggle(removeEquipmentIds, setRemoveEquipmentIds, id)
                        }
                        className="accent-accent"
                      />
                      <span>{equipmentName(id)}</span>
                    </label>
                  ))}
                  {(session?.requiredEquipmentIds.length ?? 0) === 0 ? (
                    <p className="text-xs text-faint">This session has no kit listed.</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {changeType === "person_change" && (
            <div className="mt-4 space-y-4">
              <div>
                <span className={labelClass}>Add to the crew</span>
                <div className="mt-2 space-y-1.5">
                  {graph.people.map((person) => (
                    <label
                      key={person.id}
                      className="flex items-center gap-2.5 text-sm text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        checked={addPersonIds.includes(person.id)}
                        onChange={() => toggle(addPersonIds, setAddPersonIds, person.id)}
                        className="accent-accent"
                      />
                      <span>{person.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className={labelClass}>Take off the crew</span>
                <div className="mt-2 space-y-1.5">
                  {(session?.assignedPersonIds ?? []).map((id) => (
                    <label
                      key={id}
                      className="flex items-center gap-2.5 text-sm text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        checked={removePersonIds.includes(id)}
                        onChange={() => toggle(removePersonIds, setRemovePersonIds, id)}
                        className="accent-accent"
                      />
                      <span>{personName(id)}</span>
                    </label>
                  ))}
                  {(session?.assignedPersonIds.length ?? 0) === 0 ? (
                    <p className="text-xs text-faint">Nobody is assigned to this yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <label className="mt-4 block">
            <span className={labelClass}>Why? (optional)</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="The speaker's train is late…"
              className={fieldClass}
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={preview}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy && !report ? "Checking…" : "Preview what this touches"}
            </button>
          </div>
          <p className="mt-3 text-xs text-faint">
            Previewing writes nothing. You will see every conflict and every follow-up
            before anything is saved.
          </p>
        </CardBody>
      </Card>

      {/* ── The impact ──────────────────────────────────────────────────── */}
      <div id="impact" className="space-y-6">
        {error && (
          <Callout title="That change could not be worked out" tone="clay" icon={<IconAlert className="h-4 w-4" />}>
            {error}
          </Callout>
        )}

        {entry && (
          <Card className="border-moss/30 bg-moss-soft">
            <CardBody>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-moss text-white">
                  <IconCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-[1.15rem] text-ink">
                    Saved: {entry.changeLabel}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {count(entry.followUpTaskIds.length, "follow-up")} created and
                    written back to{" "}
                    {sourceKind === "notion" ? "Notion" : "the local record"}.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link
                  href="/roles"
                  className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-accent-hover"
                >
                  See who owns the work now
                  <IconArrow className="h-4 w-4" />
                </Link>
                <Link
                  href="/report"
                  className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-accent-hover"
                >
                  Open the report
                  <IconArrow className="h-4 w-4" />
                </Link>
              </div>
            </CardBody>
          </Card>
        )}

        {!report && !error && (
          <Card>
            <CardBody className="py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-sunk text-accent">
                <IconSparkle className="h-7 w-7" />
              </span>
              <p className="mt-5 font-display text-hero text-ink">
                Nothing checked yet
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                Choose a change on the left and preview it. You will see what it
                reaches, what is in the way, and the follow-up work it creates — before
                anything is written.
              </p>
            </CardBody>
          </Card>
        )}

        {report && (
          <>
            <Card>
              <CardBody>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="accent" icon={<IconSparkle className="h-3.5 w-3.5" />}>
                    written from the rules, not by a model
                  </Chip>
                  <span className="text-xs text-faint">
                    based on {count(report.summary.sourceRecordIds.length, "record")}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-hero text-ink">
                  {report.changeLabel}
                </h2>
                <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-soft">
                  {report.summary.text}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <SectionTitle
                  icon={<IconSparkle className="h-5 w-5" />}
                  meta={count(report.affected.length, "record")}
                >
                  What this one change reaches
                </SectionTitle>
                <div className="mt-5">
                  <BlastRadius
                    centerLabel={graph.sessions.find((s) => s.id === sessionId)?.title ?? "Session"}
                    centerNote="the change"
                    nodes={blastNodes}
                  />
                </div>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {report.affected.map((record) => (
                    <li
                      key={`${record.entity}-${record.id}-${record.relation}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-sunk px-3.5 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">
                          {record.label}
                        </span>
                        <span className="block text-xs text-faint">
                          {relationLabel(record.relation)}
                        </span>
                      </span>
                      <Chip tone={ENTITY_TONE[record.entity] ?? "neutral"}>
                        {ENTITY_KIND[record.entity] ?? entityLabel(record.entity)}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <SectionTitle
                  icon={<IconAlert className="h-5 w-5" />}
                  meta={count(report.conflicts.length, "conflict")}
                >
                  What is in the way
                </SectionTitle>
                {report.conflicts.length === 0 ? (
                  <div className="mt-5 rounded-card border border-moss/25 bg-moss-soft p-5">
                    <p className="font-display text-[1.05rem] text-ink">
                      The rules found no conflicts.
                    </p>
                    <p className="mt-1.5 text-sm text-ink-soft">
                      The move fits. Follow-ups below are still worth sending — they are
                      what keeps it that way.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {report.conflicts.map((conflict) => {
                      const tone =
                        conflict.severity === "blocking"
                          ? "clay"
                          : conflict.severity === "warning"
                            ? "ochre"
                            : "slate";
                      return (
                        <li
                          key={conflict.id}
                          className={`rounded-card border p-4 ${
                            tone === "clay"
                              ? "border-clay/30 bg-clay-soft"
                              : tone === "ochre"
                                ? "border-ochre/30 bg-ochre-soft"
                                : "border-slate/25 bg-slate-soft"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Chip
                              tone={tone}
                              icon={
                                tone === "clay" ? (
                                  <IconAlert className="h-3.5 w-3.5" />
                                ) : tone === "ochre" ? (
                                  <IconWarn className="h-3.5 w-3.5" />
                                ) : (
                                  <IconInfo className="h-3.5 w-3.5" />
                                )
                              }
                            >
                              {severityLabel(conflict.severity)}
                            </Chip>
                            {conflict.ownerRole ? (
                              <Chip tone={toneFor(conflict.ownerRole)}>
                                {roleLabel(conflict.ownerRole)} should fix this
                              </Chip>
                            ) : null}
                          </div>
                          <p className="mt-2.5 text-sm leading-relaxed text-ink">
                            {conflict.message}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <SectionTitle
                  icon={<IconCheck className="h-5 w-5" />}
                  meta={`${selected.length} of ${report.followUps.length} kept`}
                >
                  The work this creates
                </SectionTitle>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Each one already has an owner and a deadline. Untick anything you do
                  not want written back.
                </p>

                <div className="mt-6 space-y-6">
                  {followUpsByRole.map(({ role, items }) => (
                    <section key={role}>
                      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
                        <Chip tone={toneFor(role)}>{roleLabel(role)}</Chip>
                        <span className="text-xs text-faint">
                          {count(items.length, "follow-up")}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted">{ROLE_BLURBS[role]}</p>
                      <ul className="mt-3 space-y-2.5">
                        {items.map((followUp) => {
                          const kept = selected.includes(followUp.id);
                          return (
                            <li
                              key={followUp.id}
                              className={`flex items-start gap-3 rounded-card border p-4 transition-colors ${
                                kept
                                  ? "border-line bg-surface"
                                  : "border-dashed border-line-strong bg-surface-sunk"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={kept}
                                onChange={() => toggle(selected, setSelected, followUp.id)}
                                className="mt-1 accent-accent"
                                aria-label={followUp.title}
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-medium ${
                                    kept ? "text-ink" : "text-muted line-through"
                                  }`}
                                >
                                  {followUp.title}
                                </p>
                                <p className="mt-1 text-xs text-faint">
                                  Due {formatDateTime(followUp.dueAt)}
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-muted">
                                  {followUp.reason}
                                </p>
                                {followUp.candidatePersonIds &&
                                followUp.candidatePersonIds.length > 0 ? (
                                  <p className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                                    <span className="text-faint">Could take this:</span>
                                    {followUp.candidatePersonIds.map((id) => (
                                      <span
                                        key={id}
                                        className="rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-accent-ink"
                                      >
                                        {personName(id)}
                                      </span>
                                    ))}
                                    <span className="text-faint">
                                      — a suggestion, not an assignment
                                    </span>
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                  {report.followUps.length === 0 ? (
                    <p className="text-sm text-muted">
                      The rules did not find any follow-up work for this change.
                    </p>
                  ) : null}
                </div>

                <div className="mt-8 flex flex-wrap items-end gap-4 rounded-card border border-line bg-surface-sunk p-5">
                  <label className="block min-w-[13rem]">
                    <span className={labelClass}>Who is approving this?</span>
                    <select
                      value={approvedByRole}
                      onChange={(event) => setApprovedByRole(event.target.value as Role)}
                      className={fieldClass}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={approve}
                    disabled={busy || !report}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft disabled:opacity-40"
                  >
                    <IconCheck className="h-4 w-4" />
                    {busy ? "Saving…" : "Approve & write it back"}
                  </button>
                  <p className="max-w-xs text-xs text-faint">
                    This updates the session and creates{" "}
                    {count(selected.length, "task")} in the workspace. Everything else
                    stays put.
                  </p>
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
