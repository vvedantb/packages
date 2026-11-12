// Pure step types for the activity timeline: no React, so `@vvedantb/native-ui`
// keeps a byte-identical copy (`src/ai/activity-step-types.ts`), with the step
// labels and grouping that read them.

/** One item in a todo checklist step (type "todos"). */
export interface ActivityTodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

export interface ActivityStepOutput {
  text: string;
  exitCode?: number;
  truncated?: boolean;
}

export interface ActivityStepEdit {
  oldText: string;
  newText: string;
}

/** One choice offered by an AskUserQuestion prompt. */
export interface ActivityQuestionOption {
  label: string;
  description?: string;
}

/** One question of an AskUserQuestion prompt, with the choices shown. */
export interface ActivityQuestion {
  question: string;
  header?: string;
  multiSelect?: boolean;
  options: ActivityQuestionOption[];
}

export interface ActivityStep {
  type:
    | "read"
    | "edit"
    | "write"
    | "bash"
    | "search_files"
    | "search_code"
    | "web_fetch"
    | "web_search"
    | "subtask"
    | "notebook"
    | "thinking"
    | "reasoning"
    | "response"
    | "question"
    | "todos"
    | "tool"
    | "notice"
    | "hook"
    | "status"
    /** A queued user message the agent took into this live turn (Steer). */
    | "steer";
  label: string;
  detail?: string;
  /** Full, unshortened path for file-type steps. Powers the chat File Viewer. */
  path?: string;
  /** `pending`: a planned step that has not started (sandbox startup stages). */
  status: "complete" | "active" | "pending";
  /** The tool_use id that produced this step (Claude only). */
  toolUseId?: string;
  /** Parent `Agent` tool_use id — set on steps that ran inside a subagent. */
  parentToolUseId?: string;
  /** Todo checklist snapshot (type "todos" only). */
  todos?: ActivityTodoItem[];
  /** Bash command (fuller than detail, capped). */
  command?: string;
  /** Tool result transcript (tail-capped). */
  output?: ActivityStepOutput;
  /** Edit before/after snippets. */
  edits?: ActivityStepEdit[];
  /** Codex file_change paths. */
  files?: string[];
  /** Write tool content head preview. */
  contentPreview?: string;
  /** True when the tool failed or exited non-zero. */
  isError?: boolean;
  /** Wall time from push → complete (ms). */
  durationMs?: number;
  /** AskUserQuestion prompt (type "question" only): the questions and options shown to the user. */
  questions?: ActivityQuestion[];
  /** AskUserQuestion answers keyed by question text. Absent when the turn ended without a structured answer. */
  answers?: Record<string, string>;
  /**
   * The transcript query stripped this step's expanded-only fields (`output`,
   * `edits`, `contentPreview`) to keep the chat subscription small. The row
   * still opens; the body fills in once the full payload is fetched.
   */
  hasHiddenDetail?: boolean;
}

/** True when the step has expandable rich detail to show. */
export function activityStepHasRichDetail(step: ActivityStep): boolean {
  return Boolean(
    step.command ||
    step.output ||
    (step.edits && step.edits.length > 0) ||
    (step.files && step.files.length > 0) ||
    step.contentPreview ||
    step.hasHiddenDetail,
  );
}
