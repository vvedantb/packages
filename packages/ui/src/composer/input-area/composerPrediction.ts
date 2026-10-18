/** Trailing-edge debounce: how long the user must pause before asking the model. */
const PREDICTION_IDLE_MS = 500;

/** Below this, there is not enough text to continue usefully. */
const PREDICTION_MIN_CHARS = 12;

/**
 * True when no completion should be requested for this draft. Skips short
 * drafts, in-progress `@` or `/` tokens (the slash menu owns those), and text
 * that already ends a sentence.
 */
export function shouldSkipPrediction(value: string): boolean {
  if (value.trim().length < PREDICTION_MIN_CHARS) return true;
  const lastWord = value.split(/\s/).pop() ?? "";
  if (lastWord.startsWith("@") || lastWord.startsWith("/")) return true;
  return /[.!?]\s*$/.test(value);
}

/**
 * The model returns a bare continuation. Add the joining space here so the
 * ghost text matches what accepting it produces.
 */
export function ghostSuggestion(value: string, completion: string): string {
  return /\s$/.test(value) || /^\s/.test(completion)
    ? completion
    : ` ${completion}`;
}

/**
 * Waits for a typing pause, then asks for a completion. Returns a cancel
 * function that clears the timer; a late reply is dropped once cancelled.
 */
export function scheduleCompletion(
  value: string,
  complete: (text: string) => Promise<string>,
  onResult: (completion: string) => void,
  idleMs: number = PREDICTION_IDLE_MS,
): () => void {
  let cancelled = false;
  const timer = setTimeout(() => {
    complete(value)
      .then((completion) => {
        if (!cancelled && completion) onResult(completion);
      })
      .catch(console.error);
  }, idleMs);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
