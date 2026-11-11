import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  deriveActionGroupSummary,
  deriveStepRowPresentation,
  resolveCommandVisualKind,
} from "../src/ai/activity-step-label";
import type { ActivityStep } from "../src/ai/activity-step-types";
import {
  ACTIVITY_MAX_VISIBLE_CHILDREN,
  activityChildRows,
  activityStepSeconds,
  foldedActivitySegments,
} from "../src/ai/activity-timeline";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("activity timeline copies", () => {
  for (const file of ["activity-step-label.ts", "activity-tasks-utils.ts", "activity-step-types.ts"]) {
    it(`src/ai/${file} is byte-identical to @vvedantb/ui src/ai-elements/${file}`, () => {
      expect(readFileSync(join(root, "src/ai", file), "utf8")).toBe(
        readFileSync(join(root, "..", "ui/src/ai-elements", file), "utf8"),
      );
    });
  }
});

const step = (fields: Partial<ActivityStep> & Pick<ActivityStep, "type">): ActivityStep => ({
  label: "",
  status: "complete",
  ...fields,
});

describe("step rows", () => {
  it("reads files as a short verb and a file chip", () => {
    expect(
      deriveStepRowPresentation(step({ type: "write", label: "Created file", detail: ".../reports/toCsv.ts", path: "/repo/src/reports/toCsv.ts" }), false),
    ).toEqual({ text: "Created", fileChip: { name: "toCsv.ts", path: "/repo/src/reports/toCsv.ts" } });
    expect(deriveStepRowPresentation(step({ type: "read", detail: "src/App.tsx" }), true).text).toBe("Reading");
  });

  it("names commands by what they do, with a git or search glyph", () => {
    const row = (detail: string) => deriveStepRowPresentation(step({ type: "bash", label: "Ran command", detail }), false).text;
    expect(row("pnpm vitest run src/reports")).toBe("Ran pnpm vitest run src/reports");
    expect(row("git status --short")).toBe("Checked git status");
    expect(row("bash -lc 'cd /repo && rg -n buildRows src'")).toBe("Searched for buildRows in src");
    expect(resolveCommandVisualKind("git -C /repo log --oneline")).toBe("git");
    expect(resolveCommandVisualKind("rg buildRows")).toBe("inspect");
    expect(resolveCommandVisualKind("pnpm test")).toBe("terminal");
  });

  it("says which MCP server a tool used, and folds hooks and servers into the summary", () => {
    const mcp = step({ type: "tool", label: "mcp__linear__list_issues" });
    expect(deriveStepRowPresentation(mcp, false).text).toBe("Used Linear: List Issues");
    expect(deriveActionGroupSummary([step({ type: "read" }), mcp, step({ type: "hook", label: "PreToolUse" })])).toBe(
      "Read files, used Linear, ran hooks",
    );
  });

  it("gives a finished step its whole seconds, and none under a second", () => {
    expect(activityStepSeconds(step({ type: "bash", durationMs: 5400 }))).toBe(5);
    expect(activityStepSeconds(step({ type: "read", durationMs: 90 }))).toBeUndefined();
    expect(activityStepSeconds(step({ type: "bash", status: "active", durationMs: 5400 }))).toBeUndefined();
  });
});

describe("folded timeline", () => {
  it("keeps reasoning as prose, folds tool runs, and stands narration on its own", () => {
    const segments = foldedActivitySegments([
      step({ type: "reasoning", detail: "Find the table." }),
      step({ type: "search_code", detail: "buildRows" }),
      step({ type: "response", detail: "On it." }),
      step({ type: "read", path: "/repo/a.ts" }),
      step({ type: "todos", label: "Task list", todos: [{ content: "Write it", status: "completed" }] }),
      step({ type: "notice", label: "Context compacted" }),
      step({ type: "bash", detail: "pnpm test" }),
    ]);
    expect(segments.map((segment) => (segment.kind === "actions" ? `actions:${segment.rows.length}` : segment.kind))).toEqual([
      "reasoning",
      "actions:2",
      "row",
      "row",
      "actions:1",
    ]);
  });

  it("nests the steps a subagent ran under its row, capped with the rest counted", () => {
    const children = Array.from({ length: ACTIVITY_MAX_VISIBLE_CHILDREN + 2 }, (_, index) =>
      step({ type: "read", path: `/repo/${index}.ts`, parentToolUseId: "agent-1" }),
    );
    const [segment] = foldedActivitySegments([
      step({ type: "subtask", label: "Ran agent", detail: "Audit the tests", toolUseId: "agent-1" }),
      ...children,
      step({ type: "response", detail: "Done.", parentToolUseId: "agent-1" }),
    ]);
    expect(segment?.kind).toBe("actions");
    const row = segment?.kind === "actions" ? segment.rows[0] : undefined;
    expect(row && deriveStepRowPresentation(row.step, false).text).toBe("Ran agent: Audit the tests");
    expect(row && activityChildRows(row)).toMatchObject({ total: 10, overflow: 2 });
    expect(row && activityChildRows(row).shown).toHaveLength(ACTIVITY_MAX_VISIBLE_CHILDREN);
  });
});
