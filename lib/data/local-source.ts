import { promises as fs } from "node:fs";
import path from "node:path";
import type { EventGraph } from "@/lib/domain/types";
import type { EventSource } from "./source";

const SEED_PATH = path.join(process.cwd(), "data", "seed", "event-graph.json");
const RUNTIME_PATH = path.join(process.cwd(), "data", "runtime", "graph.json");

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, "utf8")) as T;
}

/**
 * Offline source. First read falls back to the seed; once a change is
 * applied the mutated graph is persisted to data/runtime/graph.json so the
 * command center survives a page reload. Delete that file to reset the demo.
 */
export const localSource: EventSource = {
  kind: "local",

  async readGraph(): Promise<EventGraph> {
    if (await exists(RUNTIME_PATH)) {
      return readJson<EventGraph>(RUNTIME_PATH);
    }
    return readJson<EventGraph>(SEED_PATH);
  },

  async writeGraph(graph: EventGraph): Promise<void> {
    await fs.mkdir(path.dirname(RUNTIME_PATH), { recursive: true });
    await fs.writeFile(RUNTIME_PATH, JSON.stringify(graph, null, 2), "utf8");
  },
};

/** Drop the persisted runtime graph so the demo replays from the seed. */
export async function resetLocalGraph(): Promise<void> {
  await fs.rm(RUNTIME_PATH, { force: true });
}
