"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ChangeLogEntry,
  ChangeRequest,
  EventGraph,
  ImpactReport,
  Role,
} from "@/lib/domain/types";
import { ROLES } from "@/lib/domain/types";
import { roleLabel } from "@/lib/format";

const severityStyles: Record<string, string> = {
  blocking: "border-rose-500/50 bg-rose-500/10 text-rose-200",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-200",
  info: "border-sky-500/50 bg-sky-500/10 text-sky-200",
};

export default function ChangeConsole({
  graph,
  sourceKind,
}: {
  graph: EventGraph;
  sourceKind: string;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(graph.sessions[0]?.id ?? "");
  const [newVenueId, setNewVenueId] = useState(graph.venues[1]?.id ?? "");
  const [reason, setReason] = useState("Roof leak reported in the Main Auditorium.");
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

  const change: ChangeRequest = {
    changeType: "venue_change",
    eventId: session?.eventId ?? graph.events[0]?.id ?? "",
    sessionId,
    newVenueId,
    reason,
  };

  async function preview() {
    setBusy(true);
    setError(null);
    setEntry(null);
    try {
      const response = await fetch("/api/change/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(change),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Preview failed.");
      const nextReport = data.report as ImpactReport;
      setReport(nextReport);
      setSelected(nextReport.followUps.map((followUp) => followUp.id));
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
        body: JSON.stringify({ change, approvedByRole, selectedFollowUpIds: selected }),
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

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <div className="text-xs uppercase tracking-wider text-slate-500">
          Source: {sourceKind}
        </div>

        <label className="block text-sm">
          <span className="text-slate-300">Session</span>
          <select
            value={sessionId}
            onChange={(event) => {
              setSessionId(event.target.value);
              setReport(null);
              setEntry(null);
            }}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {graph.sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-300">New venue</span>
          <select
            value={newVenueId}
            onChange={(event) => {
              setNewVenueId(event.target.value);
              setReport(null);
              setEntry(null);
            }}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {graph.venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} (seats {venue.capacity})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-300">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-300">Approving role</span>
          <select
            value={approvedByRole}
            onChange={(event) => setApprovedByRole(event.target.value as Role)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            onClick={preview}
            disabled={busy}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            Preview impact
          </button>
          <button
            onClick={approve}
            disabled={busy || !report}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Approve &amp; apply
          </button>
        </div>
        {!report && (
          <p className="text-xs text-slate-500">
            Preview first. Applying writes tasks and a linked change log entry.
          </p>
        )}
      </section>

      <section className="space-y-6">
        {error && (
          <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {entry && (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
            <div className="text-sm font-medium text-emerald-200">
              Change {entry.id} approved and written back
            </div>
            <p className="mt-1 text-sm text-emerald-100/80">
              {entry.affectedRecordIds.length} records referenced ·{" "}
              {entry.followUpTaskIds.length} follow-up tasks created. See them on the
              dashboard and in the role briefings.
            </p>
          </div>
        )}

        {report && (
          <>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-violet-500/50 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
                  generated · {report.summary.generator}
                </span>
                <span className="text-xs text-slate-500">
                  {report.summary.sourceRecordIds.length} source records linked
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-200">{report.summary.text}</p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Blast radius · {report.affected.length} records
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {report.affected.map((record) => (
                  <li
                    key={`${record.entity}-${record.id}-${record.relation}`}
                    className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div className="text-sm text-slate-100">{record.label}</div>
                    <div className="text-xs text-slate-500">
                      {record.entity} · {record.relation.replace(/_/g, " ")}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Conflicts · {report.conflicts.length}
              </h2>
              <ul className="mt-3 space-y-2">
                {report.conflicts.map((conflict) => (
                  <li
                    key={conflict.id}
                    className={`rounded-md border p-3 text-sm ${severityStyles[conflict.severity]}`}
                  >
                    <div className="text-xs uppercase tracking-wider opacity-80">
                      {conflict.severity} · {conflict.kind.replace(/_/g, " ")}
                    </div>
                    <div className="mt-1">{conflict.message}</div>
                  </li>
                ))}
                {report.conflicts.length === 0 && (
                  <li className="text-sm text-slate-500">
                    No conflicts detected by the current rules.
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Proposed follow-ups · {report.followUps.length}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Uncheck anything you do not want written back to Notion.
              </p>
              <ul className="mt-3 space-y-2">
                {report.followUps.map((followUp) => (
                  <li
                    key={followUp.id}
                    className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(followUp.id)}
                      onChange={() => toggle(followUp.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-slate-100">{followUp.title}</div>
                      <div className="text-xs text-slate-500">
                        {roleLabel(followUp.ownerRole)} · due{" "}
                        {new Date(followUp.dueAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{followUp.reason}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
