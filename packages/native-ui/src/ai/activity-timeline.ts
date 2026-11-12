// The folded (Codex-style) rules of the web `ActivityTasks`
// (`@vvedantb/ui` `activity-tasks.tsx`), as pure logic for an app that draws
// the rows with the `AgentTrace` parts. The row text, the grouping and the
// step types are byte-identical copies of the web files
// (`activity-step-label.ts`, `activity-tasks-utils.ts`, `activity-step-types.ts`).
import type { ActivityRow, ActivitySegment } from "./activity-tasks-utils";
import { buildActivityRows, groupActivityRows } from "./activity-tasks-utils";
import type { ActivityStep } from "./activity-step-types";

/** Blocks a settled timeline shows before "Show N more" (web `MAX_VISIBLE_ROWS`). */
export const ACTIVITY_MAX_VISIBLE_BLOCKS = 8;

/** Child rows a subagent step shows before "+N more" (web `MAX_VISIBLE_CHILDREN`). */
export const ACTIVITY_MAX_VISIBLE_CHILDREN = 8;

/** Step types the folded layout hides: the reply text and the status thinking lines. */
const HIDDEN_TYPES = new Set<ActivityStep["type"]>(["thinking", "response"]);

/**
 * A turn's steps as the blocks of the folded timeline: each reasoning step as
 * prose, each run of tool calls behind one summary line, narration (to-dos,
 * notices, questions) as lone rows, and the steps a subagent ran nested under
 * its row. Reply text and status thinking lines are dropped, as on the web.
 */
export function foldedActivitySegments(steps: ActivityStep[]): ActivitySegment[] {
  return groupActivityRows(buildActivityRows(steps).filter((row) => !HIDDEN_TYPES.has(row.step.type)));
}

/**
 * The child rows a subagent row shows (its reply text belongs to its own
 * thread, so it is dropped), capped at `ACTIVITY_MAX_VISIBLE_CHILDREN`, and
 * how many are left for "+N more".
 */
export function activityChildRows(row: ActivityRow): { shown: ActivityRow[]; total: number; overflow: number } {
  const children = (row.children ?? []).filter((child) => !HIDDEN_TYPES.has(child.step.type));
  const overflow = Math.max(0, children.length - ACTIVITY_MAX_VISIBLE_CHILDREN);
  return { shown: children.slice(0, ACTIVITY_MAX_VISIBLE_CHILDREN), total: children.length, overflow };
}

/** Whole seconds a finished step took, for the faded "4s" after its row; undefined when unknown or under 1s. */
export function activityStepSeconds(step: ActivityStep): number | undefined {
  if (step.status !== "complete" || !step.durationMs) return undefined;
  const seconds = Math.round(step.durationMs / 1000);
  return seconds >= 1 ? seconds : undefined;
}
