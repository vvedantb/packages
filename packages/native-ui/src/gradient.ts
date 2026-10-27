import type * as ExpoLinearGradient from "expo-linear-gradient";

export type ExpoLinearGradientModule = typeof ExpoLinearGradient;

let expoLinearGradient: ExpoLinearGradientModule | null | undefined;

/**
 * `expo-linear-gradient`, or `null` when the optional peer is not installed.
 * Metro bundles a `require` placed directly in a `try` block as an optional
 * dependency, so a missing peer does not break the bundle.
 */
export function loadLinearGradient(): ExpoLinearGradientModule | null {
  if (expoLinearGradient === undefined) {
    try {
      expoLinearGradient = require("expo-linear-gradient") as ExpoLinearGradientModule;
    } catch {
      expoLinearGradient = null;
    }
  }
  return expoLinearGradient;
}
