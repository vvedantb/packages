import { useEffect, useState } from "react";
import {
  ghostSuggestion,
  scheduleCompletion,
  shouldSkipPrediction,
} from "./composerPrediction";

/**
 * As-you-type ghost text for `InputArea`. The caller renders `suggestion` and
 * owns accepting it. A result shows only while the draft it was requested for
 * is still the current draft. Pass `getPrediction` to make the request.
 */
export function useInputAreaPrediction({
  value,
  suspended = false,
  enabled = true,
  getPrediction,
}: {
  value: string;
  suspended?: boolean;
  enabled?: boolean;
  getPrediction?: (text: string) => Promise<string>;
}): { suggestion: string | undefined; dismiss: () => void } {
  const [result, setResult] = useState<{ forValue: string; text: string }>();
  const [dismissedFor, setDismissedFor] = useState<string>();

  const idle =
    !enabled ||
    getPrediction === undefined ||
    suspended ||
    shouldSkipPrediction(value);
  const settled = result?.forValue === value || dismissedFor === value;

  // Debounced request: it has to react to the draft changing.
  useEffect(() => {
    if (idle || settled || getPrediction === undefined) return;
    return scheduleCompletion(
      value,
      getPrediction,
      (text) => setResult({ forValue: value, text }),
    );
  }, [value, idle, settled, getPrediction]);

  const visible = !idle && dismissedFor !== value && result?.forValue === value;
  return {
    suggestion: visible ? ghostSuggestion(value, result.text) : undefined,
    dismiss: () => setDismissedFor(value),
  };
}
