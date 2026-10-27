import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

/**
 * The system Reduce Motion setting (iOS) or Remove animations (Android). The
 * first value is Reanimated's synchronous read, so an overlay that mounts open
 * does not animate once before the setting loads. Later changes come from
 * `AccessibilityInfo`.
 */
export function useReduceMotion() {
  const initial = useReducedMotion();
  const [enabled, setEnabled] = useState(initial);

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setEnabled,
    );
    return () => subscription.remove();
  }, []);

  return enabled;
}
