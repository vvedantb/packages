/** Type and copy shared by the AI chat parts. */
import { Platform } from "react-native";
import type { TextSize } from "../controlStyles";

export type ChatTextKind = "body" | "small" | "caption";

/**
 * `body` is message text: `text-sm` (14 / 20), as the web `MessageContent`.
 * `small` is the secondary text of triggers, trace lines and sources: also
 * `text-sm` (the web sources trigger is `text-xs`). `caption` is `text-xs`
 * (12 / 16): step descriptions, file chips and code headers. Larger text
 * steps each up, as `Textarea` does.
 */
export function chatTextSize(kind: ChatTextKind, largerText: boolean): TextSize {
  if (kind === "body") return largerText ? "text-xl" : "text-sm";
  if (kind === "small") return largerText ? "text-lg" : "text-sm";
  return largerText ? "text-base" : "text-xs";
}

/**
 * The web `text-2xs` token (11 / 16, tracking 0.01em) as a style, for
 * `MessageMeta size="2xs"` and an app's own small labels. React Native has no
 * `em`, so the tracking is in points.
 */
export const META_TEXT_STYLE = { fontSize: 11, lineHeight: 16, letterSpacing: 0.11 } as const;

/** The system monospace face, for code and reasoning text (web `font-mono`). */
export const MONO_FONT = Platform.select({ ios: "Menlo", default: "monospace" });

/**
 * Elapsed time for "Thought for 12s" and "Worked for 1m 5s": whole seconds
 * under a minute, minutes and seconds above. Negative and fractional values
 * round to whole seconds, from 0.
 */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}
