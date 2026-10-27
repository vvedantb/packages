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

export function selectionHaptic() {
  if (Platform.OS === "web") {
    return;
  }
  void loadHaptics()?.selectionAsync();
}
