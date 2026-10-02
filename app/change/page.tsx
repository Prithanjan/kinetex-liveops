import { getSource } from "@/lib/data/source";
import ChangeConsole from "@/components/ChangeConsole";

export const dynamic = "force-dynamic";

export default async function ChangePage() {
  const source = await getSource();
  const graph = await source.readGraph();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          Step 1 to 5 · preview before anything is written
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-50">Change Console</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Pick a session and a new venue. LiveOps traverses the dependency graph,
          lists conflicts, and proposes role-owned follow-ups. Nothing is applied
          until a person approves it.
        </p>
      </header>
      <ChangeConsole graph={graph} sourceKind={source.kind} />
    </div>
  );
}
