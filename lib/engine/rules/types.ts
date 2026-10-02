import type {
  ChangeRequest,
  ChangeType,
  Conflict,
  EventGraph,
  Session,
} from "@/lib/domain/types";
import type { GraphIndex } from "../graph";

/** Everything a rule may read. Rules are pure and never touch I/O. */
export interface RuleContext {
  graph: EventGraph;
  index: GraphIndex;
  /** The session as it would be after the change. */
  proposed: Session;
  /** The session as it is now. */
  current: Session;
  change: ChangeRequest;
}

export interface Rule {
  id: string;
  appliesTo: ChangeType[];
  evaluate(ctx: RuleContext): Conflict[];
}
