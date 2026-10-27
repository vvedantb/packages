import type * as ExpoBlur from "expo-blur";

export type ExpoBlurModule = typeof ExpoBlur;

let expoBlur: ExpoBlurModule | null | undefined;

/**
 * `expo-blur`, or `null` when the optional peer is not installed. Metro
 * bundles a `require` placed directly in a `try` block as an optional
 * dependency, so a missing peer does not break the bundle.
 */
export function loadBlur(): ExpoBlurModule | null {
  if (expoBlur === undefined) {
    try {
      expoBlur = require("expo-blur") as ExpoBlurModule;
    } catch {
      expoBlur = null;
    }
  }
  return expoBlur;
}

export type GlassMode = "blur" | "backdrop" | "solid";

/**
 * How a floating surface draws its glass: a native `BlurView` on iOS and
 * Android, a CSS backdrop blur on web, or the solid fill when blur is off,
 * Reduce Transparency is on or `expo-blur` is missing.
 */
export function glassMode({
  os,
  blur,
  reduceTransparency,
  hasBlurView,
}: {
  os: string;
  blur: boolean;
  reduceTransparency: boolean;
  hasBlurView: boolean;
}): GlassMode {
  if (!blur || reduceTransparency) {
    return "solid";
  }
  if (os === "web") {
    return "backdrop";
  }
  return (os === "ios" || os === "android") && hasBlurView ? "blur" : "solid";
}
