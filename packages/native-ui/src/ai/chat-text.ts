/** Type and copy shared by the AI chat parts. */
import { Platform } from "react-native";
import type { TextSize } from "../controlStyles";

export type ChatTextKind = "body" | "small" | "caption";

/**
 * `body` is message text: `text-base` (16 / 24), the phone body size (the web
 * `MessageContent` is `text-sm`, but the web composer is 16 on phones).
 * `small` is the secondary text of triggers, trace lines and sources:
 * `text-sm` (14 / 20; the web sources trigger is `text-xs`). `caption` is
 * `text-xs` (12 / 16): step descriptions, file chips and code headers. Larger
 * text steps each up, as `Textarea` does.
 */
export function chatTextSize(kind: ChatTextKind, largerText: boolean): TextSize {
  if (kind === "body") return largerText ? "text-xl" : "text-base";
  if (kind === "small") return largerText ? "text-lg" : "text-sm";
  return largerText ? "text-base" : "text-xs";
}

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
