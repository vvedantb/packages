import { Platform } from "react-native";
import type * as ExpoHaptics from "expo-haptics";

export type ExpoHapticsModule = typeof ExpoHaptics;

let expoHaptics: ExpoHapticsModule | null | undefined;

/**
 * `expo-haptics`, or `null` when the optional peer is not installed. Metro
 * bundles a `require` placed directly in a `try` block as an optional
 * dependency, so a missing peer does not break the bundle.
 */
export function loadHaptics(): ExpoHapticsModule | null {
  if (expoHaptics === undefined) {
    try {
      expoHaptics = require("expo-haptics") as ExpoHapticsModule;
    } catch {
      expoHaptics = null;
    }
  }
  return expoHaptics;
}

function native(): ExpoHapticsModule | null {
  return Platform.OS === "web" ? null : loadHaptics();
}

/** A value ticks past a step: a tab, a segment, a checkbox. */
export function selectionHaptic() {
  void native()?.selectionAsync();
}

/**
 * A physical moment: `"light"` when something snaps home (a dragged sheet
 * springing back), `"medium"` when a destructive action fires. Fire it in the
 * same frame as the visual, once per user action.
 */
export function impactHaptic(weight: "light" | "medium") {
  const haptics = native();
  if (!haptics) return;
  void haptics.impactAsync(
    weight === "light" ? haptics.ImpactFeedbackStyle.Light : haptics.ImpactFeedbackStyle.Medium,
  );
}

/** An operation the user started succeeded or failed (the success and error toasts). */
export function notificationHaptic(outcome: "success" | "error") {
  const haptics = native();
  if (!haptics) return;
  void haptics.notificationAsync(
    outcome === "success"
      ? haptics.NotificationFeedbackType.Success
      : haptics.NotificationFeedbackType.Error,
  );
}
