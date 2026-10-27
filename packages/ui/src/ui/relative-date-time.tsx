import { formatCompactRelativeTime } from "../../app/src/time/compactRelativeTime";
import dayjs from "../utils/dayjs";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { useCn } from "./ui-config";

export interface RelativeDateTimeProps {
  /** Unix ms. When omitted, renders `emptyLabel` with no tooltip. */
  at?: number;
  /** Shown when `at` is missing. Default `"—"`. */
  emptyLabel?: string;
  /** dayjs format for the tooltip. Default `"DD/MM/YYYY HH:mm"`. */
  exactFormat?: string;
  className?: string;
}

/**
 * Compact relative time ("15m", "2d", calendar-aware like `dayjs().diff`) with
 * the exact date and time in a hover tooltip. Needs a `TooltipProvider` above.
 * It does not tick: the parent re-renders it (e.g. with a shared clock).
 */
export function RelativeDateTime({
  at,
  emptyLabel = "—",
  exactFormat = "DD/MM/YYYY HH:mm",
  className,
}: RelativeDateTimeProps) {
  const cn = useCn();
  if (at === undefined) {
    return <span className={cn("text-muted-foreground", className)}>{emptyLabel}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-default text-muted-foreground tabular-nums", className)}>
          {formatCompactRelativeTime(at, { calendar: true })}
        </span>
      </TooltipTrigger>
      <TooltipContent>{dayjs(at).format(exactFormat)}</TooltipContent>
    </Tooltip>
  );
}
