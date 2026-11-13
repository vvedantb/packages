import dayjs from "dayjs";
import { cn } from "../utils/cn";

/**
 * Today / Yesterday / weekday (this week) / full date — the default day label
 * for {@link ChatDayDivider}. Pure; pass `formatDay` to override.
 */
export function formatChatDayLabel(timestamp: number): string {
  const at = dayjs(timestamp);
  const now = dayjs();
  if (at.isSame(now, "day")) return "Today";
  if (at.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (at.isSame(now, "week")) return at.format("dddd");
  return at.format("MMMM D, YYYY");
}

/**
 * A message's clock time, e.g. "10:21 PM" — the default time label for
 * {@link ChatDayDivider}. Pure; pass `formatTime` to override.
 */
export function formatChatClockTime(timestamp: number): string {
  return dayjs(timestamp).format("h:mm A");
}

export interface ChatDayDividerProps {
  timestamp: number;
  /** Override the day label. Defaults to {@link formatChatDayLabel}. */
  formatDay?: (timestamp: number) => string;
  /** Override the time label. Defaults to {@link formatChatClockTime}. */
  formatTime?: (timestamp: number) => string;
  /** Merged after the base classes; use to set the label size (e.g. `text-3xs`). */
  className?: string;
}

/**
 * iMessage-style date label heading the first turn of each day: the day in
 * medium weight, the turn's time beside it. Text only — no rule lines, per the
 * no-decorative-hairline surface rule.
 */
export function ChatDayDivider({
  timestamp,
  formatDay = formatChatDayLabel,
  formatTime = formatChatClockTime,
  className,
}: ChatDayDividerProps) {
  const day = formatDay(timestamp);
  const time = formatTime(timestamp);
  return (
    <div
      role="separator"
      aria-label={`${day} ${time}`}
      className={cn(
        "flex w-full justify-center gap-1 pt-2 pb-1 text-2xs text-muted-foreground/70 select-none",
        className,
      )}
    >
      <span className="font-medium text-muted-foreground">{day}</span>
      <span>{time}</span>
    </div>
  );
}
