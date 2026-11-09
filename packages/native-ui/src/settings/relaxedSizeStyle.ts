import { sizeStyle, type TextSize } from "../controlStyles";

/** Tailwind `leading-relaxed`, as a multiple of the size. */
const RELAXED = 1.625;

/**
 * `sizeStyle(size)` with the Tailwind `leading-relaxed` line height (1.625 ×
 * the size), for the web settings descriptions (`text-xs leading-relaxed` is
 * 12 / 19.5). Set beside the `leading-relaxed` class.
 */
export function relaxedSizeStyle(size: TextSize) {
  const { fontSize } = sizeStyle(size);
  return { fontSize, lineHeight: fontSize * RELAXED };
}
