import * as React from "react";

import {
  COMPOSER_PREDICTION_DEBOUNCE_MS,
  COMPOSER_PREDICTION_MIN_LENGTH,
  initialComposerPredictionState,
  nextComposerPredictionState,
  shouldSkipComposerPrediction,
  visibleComposerPrediction,
} from "./prediction";

export type UseComposerPredictionOptions = {
  value: string;
  /** Off when there is no `getPrediction`, the composer is busy, or the caret is not at the end. */
  enabled: boolean;
  getPrediction?: (draft: string, opts: { signal: AbortSignal }) => Promise<string>;
  debounceMs?: number;
  minLength?: number;
};

export type ComposerPrediction = {
  /** Ghost text to render after the draft, including any joining space. `""` when none. */
  ghost: string;
  dismiss: () => void;
  clear: () => void;
};

/**
 * Debounced ghost-text prediction for a draft. It does no I/O itself: the caller
 * supplies `getPrediction`. Each draft change aborts the previous request. A
 * result that arrives after its signal aborted, or after the draft changed, is
 * dropped. Errors from `getPrediction` are swallowed: a failed prediction shows
 * nothing.
 */
export function useComposerPrediction({
  value,
  enabled,
  getPrediction,
  debounceMs = COMPOSER_PREDICTION_DEBOUNCE_MS,
  minLength = COMPOSER_PREDICTION_MIN_LENGTH,
}: UseComposerPredictionOptions): ComposerPrediction {
  const [state, dispatch] = React.useReducer(
    nextComposerPredictionState,
    initialComposerPredictionState,
  );

  const latestValue = React.useRef(value);
  latestValue.current = value;
  const getPredictionRef = React.useRef(getPrediction);
  getPredictionRef.current = getPrediction;
  const active = enabled && getPrediction !== undefined;

  const skip = shouldSkipComposerPrediction(value, minLength);
  const settled = state.forValue === value || state.dismissedFor === value;

  React.useEffect(() => {
    if (!active || skip || settled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const request = getPredictionRef.current;
      if (!request) return;
      request(value, { signal: controller.signal }).then(
        (text) => {
          if (controller.signal.aborted) return;
          dispatch({ type: "result", forValue: value, text, current: latestValue.current });
        },
        () => {},
      );
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, active, skip, settled, debounceMs]);

  const ghost = active ? visibleComposerPrediction(state, value, minLength) : "";

  return {
    ghost,
    dismiss: React.useCallback(
      () => dispatch({ type: "dismiss", value: latestValue.current }),
      [],
    ),
    clear: React.useCallback(() => dispatch({ type: "clear" }), []),
  };
}
