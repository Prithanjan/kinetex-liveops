"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ChangeLogEntry,
  ChangeRequest,
  ChangeType,
  EventGraph,
  ImpactReport,
  Role,
} from "@/lib/domain/types";
import { CHANGE_TYPE_LABELS, CHANGE_TYPES, ROLES } from "@/lib/domain/types";
import { roleLabel } from "@/lib/format";
import { Card, Chip, Empty, SectionTitle, severityTone, titleCase } from "@/components/ui";

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

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";
const labelClass = "block text-xs font-medium uppercase tracking-[0.12em] text-faint";

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

  const personName = (id: string) =>
    graph.people.find((person) => person.id === id)?.name ?? id;
  const equipmentName = (id: string) =>
    graph.equipment.find((item) => item.id === id)?.name ?? id;

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <Card className="self-start lg:sticky lg:top-24">
        <SectionTitle meta={sourceKind}>Request</SectionTitle>

        <div className="mt-5">
          <span className={labelClass}>Change type</span>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {CHANGE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setChangeType(type);
                  resetPreview();
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  type === changeType
                    ? "border-accent/40 bg-accent-soft text-accent-ink"
                    : "border-line-strong bg-paper text-muted hover:text-ink"
                }`}
              >
                {CHANGE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 block">
          <span className={labelClass}>Session</span>
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
          <label className="mt-5 block">
            <span className={labelClass}>New venue</span>
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
                  {venue.name} — seats {venue.capacity}
                </option>
              ))}
            </select>
          </label>
        )}

        {changeType === "time_change" && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>New start</span>
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
              <span className={labelClass}>New end</span>
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
          <div className="mt-5 space-y-4">
            <div>
              <span className={labelClass}>Add equipment</span>
              <div className="mt-2 space-y-1.5">
                {graph.equipment.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2.5 text-sm text-ink-soft"
                  >
                    <input
                      type="checkbox"
                      checked={addEquipmentIds.includes(item.id)}
                      onChange={() =>
                        toggle(addEquipmentIds, setAddEquipmentIds, item.id)
                      }
                      className="accent-accent"
                    />
                    <span>{item.name}</span>
                    <span className="text-xs text-faint">{item.status}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className={labelClass}>Remove equipment</span>
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
              </div>
            </div>
          </div>
        )}

        {changeType === "person_change" && (
          <div className="mt-5 space-y-4">
            <div>
              <span className={labelClass}>Add people</span>
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
              <span className={labelClass}>Remove people</span>
              <div className="mt-2 space-y-1.5">
                {(session?.assignedPersonIds ?? []).map((id) => (
                  <label
                    key={id}
                    className="flex items-center gap-2.5 text-sm text-ink-soft"
                  >
                    <input
                      type="checkbox"
                      checked={removePersonIds.includes(id)}
                      onChange={() =>
                        toggle(removePersonIds, setRemovePersonIds, id)
                      }
                      className="accent-accent"
                    />
                    <span>{personName(id)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <label className="mt-5 block">
          <span className={labelClass}>Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Why is this changing?"
            className={fieldClass}
          />
        </label>

        <label className="mt-5 block">
          <span className={labelClass}>Approving role</span>
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

        <div className="mt-6 flex gap-3">
          <button
            onClick={preview}
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            Preview impact
          </button>
          <button
            onClick={approve}
            disabled={busy || !report}
            className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-40"
          >
            Approve &amp; apply
          </button>
        </div>
        {!report && (
          <p className="mt-3 text-xs text-faint">
            Preview first. Applying writes tasks and a linked change log entry.
          </p>
        )}
      </Card>

      <div className="space-y-6">
        {error && (
          <div className="rounded-card border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {entry && (
          <div className="rounded-card border border-success/25 bg-success-soft p-5">
            <div className="font-display text-title text-success">
              {entry.id} approved and written back
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">
              {entry.affectedRecordIds.length} records referenced ·{" "}
              {entry.followUpTaskIds.length} follow-up tasks created. See them on the
              dashboard and in the role briefings.
            </p>
          </div>
        )}

        {!report && !error && (
          <Card>
            <SectionTitle>Impact preview</SectionTitle>
            <div className="mt-5">
              <Empty>
                Pick a change on the left, then preview. Nothing is written until you
                approve.
              </Empty>
            </div>
          </Card>
        )}

        {report && (
          <>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="accent">generated</Chip>
                <span className="text-xs text-faint">{report.summary.generator}</span>
                <span className="text-xs text-faint">
                  · {report.summary.sourceRecordIds.length} source records linked
                </span>
              </div>
              <p className="mt-4 font-display text-title text-ink">
                {report.changeLabel}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {report.summary.text}
              </p>
            </Card>

            <Card>
              <SectionTitle meta={`${report.affected.length} records`}>
                Blast radius
              </SectionTitle>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {report.affected.map((record) => (
                  <li
                    key={`${record.entity}-${record.id}-${record.relation}`}
                    className="rounded-lg border border-line bg-paper px-3 py-2.5"
                  >
                    <div className="text-sm text-ink">{record.label}</div>
                    <div className="mt-0.5 text-xs text-faint">
                      {record.entity} · {record.relation.replace(/_/g, " ")}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <SectionTitle meta={`${report.conflicts.length} found`}>
                Conflicts
              </SectionTitle>
              <ul className="mt-5 space-y-2.5">
                {report.conflicts.map((conflict) => (
                  <li
                    key={conflict.id}
                    className="rounded-lg border border-line bg-paper p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={severityTone(conflict.severity)}>
                        {conflict.severity}
                      </Chip>
                      <span className="text-xs text-faint">
                        {titleCase(conflict.kind)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {conflict.message}
                    </p>
                  </li>
                ))}
                {report.conflicts.length === 0 && (
                  <li>
                    <Empty>
                      No conflicts detected by the current rules. Follow-ups are still
                      proposed.
                    </Empty>
                  </li>
                )}
              </ul>
            </Card>

            <Card>
              <SectionTitle meta={`${report.followUps.length} proposed`}>
                Follow-ups
              </SectionTitle>
              <p className="mt-2 text-xs text-faint">
                Uncheck anything you do not want written back.
              </p>
              <ul className="mt-5 space-y-2.5">
                {report.followUps.map((followUp) => (
                  <li
                    key={followUp.id}
                    className="flex items-start gap-3 rounded-lg border border-line bg-paper p-4"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(followUp.id)}
                      onChange={() => toggle(selected, setSelected, followUp.id)}
                      className="mt-1 accent-accent"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink">
                        {followUp.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-faint">
                        <Chip>{roleLabel(followUp.ownerRole)}</Chip>
                        <span>
                          due{" "}
                          {new Date(followUp.dueAt).toLocaleString("en-IN", {
                            timeZone: IST,
                          })}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        {followUp.reason}
                      </p>
                      {followUp.candidatePersonIds &&
                        followUp.candidatePersonIds.length > 0 && (
                          <p className="mt-2 text-xs text-accent-ink">
                            Suggested:{" "}
                            {followUp.candidatePersonIds
                              .map((id) => personName(id))
                              .join(", ")}{" "}
                            (proposed, not assigned)
                          </p>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
