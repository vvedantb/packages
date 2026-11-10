import { sizeStyle, type TextSize } from "../controlStyles";

/**
 * `sizeStyle(size)` with the Tailwind `leading-relaxed` line height (1.625 ×
 * the size), for the web settings descriptions (`text-xs leading-relaxed` is
 * 12 / 19.5). Set beside the `leading-relaxed` class. Kept for the settings
 * files; the number lives in `sizeStyle`.
 */
export function relaxedSizeStyle(size: TextSize) {
  return sizeStyle(size, "relaxed");
}
