import type { ExecuteOutcome } from "./runtime.js";

/** Serialised outcomes longer than this have their result cut down to a preview. */
export const DEFAULT_RESULT_CHAR_CAP = 100_000;

/**
 * Pretty JSON of an outcome for a tool reply: `{ result | error, logs, calls, ms }`.
 * When a successful outcome serialises to more than `maxChars`, the result is
 * replaced by `{ truncated, note, resultPreview }` holding its first `maxChars`
 * characters, so the caller is told to filter inside the script instead.
 */
export function serializeExecuteOutcome(outcome: ExecuteOutcome, maxChars: number = DEFAULT_RESULT_CHAR_CAP): string {
  const base = { logs: outcome.logs, calls: outcome.calls, ms: outcome.ms };
  const full = JSON.stringify(
    outcome.ok ? { result: outcome.result, ...base } : { error: outcome.error, ...base },
    null,
    2,
  );
  if (full.length <= maxChars || !outcome.ok) return full;
  const preview = JSON.stringify(outcome.result);
  return JSON.stringify(
    {
      truncated: true,
      note: `Result was ${preview.length} characters; showing the first ${maxChars}. Filter or summarise inside the script instead.`,
      resultPreview: `${preview.slice(0, maxChars)}…`,
      ...base,
    },
    null,
    2,
  );
}
