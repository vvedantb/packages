/** Default trailing-edge debounce, in ms: how long the draft must sit before a prediction is requested. */
export const COMPOSER_PREDICTION_DEBOUNCE_MS = 500;

/** Default minimum draft length (trimmed characters) before a prediction is requested. */
export const COMPOSER_PREDICTION_MIN_LENGTH = 12;

/**
 * True when no prediction should be requested for this draft.
 *
 * Skips drafts shorter than `minLength` (trimmed), drafts whose last word starts
 * with `@` or `/` (an in-progress mention or command), and drafts that end a
 * sentence (`.`, `!` or `?`, then optional whitespace).
 */
export function shouldSkipComposerPrediction(
  value: string,
  minLength: number = COMPOSER_PREDICTION_MIN_LENGTH,
): boolean {
  if (value.trim().length < minLength) return true;
  const lastWord = value.split(/\s/).pop() ?? "";
  if (lastWord.startsWith("@") || lastWord.startsWith("/")) return true;
  if (/[.!?]\s*$/.test(value)) return true;
  return false;
}

/**
 * The ghost text for a draft: the bare continuation from the caller, with a
 * joining space added when neither side has whitespace at the join.
 */
export function joinComposerPrediction(draft: string, prediction: string): string {
  if (prediction === "") return "";
  return /\s$/.test(draft) || /^\s/.test(prediction) ? prediction : ` ${prediction}`;
}

/** What `getPrediction` last returned, and the draft it was requested for. */
export type ComposerPredictionState = {
  /** Draft the stored `text` answers, or `null` when there is none. */
  forValue: string | null;
  /** Raw text from `getPrediction` (no joining space). */
  text: string;
  /** Draft for which the user pressed Esc. Suppresses requests until the draft changes. */
  dismissedFor: string | null;
};

export type ComposerPredictionAction =
  /** A request finished. `current` is the draft at the time it finished. */
  | { type: "result"; forValue: string; text: string; current: string }
  /** Esc: hide the prediction for this draft. */
  | { type: "dismiss"; value: string }
  /** Tab accepted the prediction, or the caller reset it. */
  | { type: "clear" };

export const initialComposerPredictionState: ComposerPredictionState = {
  forValue: null,
  text: "",
  dismissedFor: null,
};

/**
 * Pure reducer for prediction state. A result is dropped when the draft moved
 * on while the request ran, or when it is empty.
 */
export function nextComposerPredictionState(
  state: ComposerPredictionState,
  action: ComposerPredictionAction,
): ComposerPredictionState {
  switch (action.type) {
    case "result":
      if (action.forValue !== action.current || action.text === "") return state;
      return { ...state, forValue: action.forValue, text: action.text };
    case "dismiss":
      return { forValue: null, text: "", dismissedFor: action.value };
    case "clear":
      return { ...state, forValue: null, text: "" };
  }
}

/**
 * Ghost text to show for `value`, or `""`. It is empty when the state answers a
 * different draft, the draft is dismissed or the draft is skipped.
 */
export function visibleComposerPrediction(
  state: ComposerPredictionState,
  value: string,
  minLength: number = COMPOSER_PREDICTION_MIN_LENGTH,
): string {
  if (state.forValue !== value || state.dismissedFor === value) return "";
  if (shouldSkipComposerPrediction(value, minLength)) return "";
  return joinComposerPrediction(value, state.text);
}

/** The draft after Tab: the draft with the ghost text appended. */
export function acceptComposerPrediction(value: string, ghost: string): string {
  return value + ghost;
}
