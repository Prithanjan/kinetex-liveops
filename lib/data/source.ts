import type { EventGraph } from "@/lib/domain/types";

/**
 * One interface, two implementations. The engine never knows whether the
 * graph came from a local seed or from Notion.
 */
export interface EventSource {
  readonly kind: "local" | "notion";
  readGraph(): Promise<EventGraph>;
  writeGraph(graph: EventGraph): Promise<void>;
}

export type SourceKind = EventSource["kind"];

export function resolveSourceKind(): SourceKind {
  return process.env.KINETEX_SOURCE === "notion" ? "notion" : "local";
}

/**
 * Lazily import the adapter so a local build never pulls Notion code paths
 * into the runtime unless it is actually selected.
 */
export async function getSource(kind: SourceKind = resolveSourceKind()): Promise<EventSource> {
  if (kind === "notion") {
    const { notionSource } = await import("./notion-source");
    return notionSource;
  }
  const { localSource } = await import("./local-source");
  return localSource;
}
