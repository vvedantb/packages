import * as React from "react";
import { IconClock } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../utils/cn";
import {
  pickerItemHoverClass,
  pickerSelectedClass,
  pickerTriggerClass,
} from "./_picker-classes";

// custom 24, hour "hh:mm" time picker replaces `<input type="time">` because the native picker varies wildly
// across browsers and platforms (chrome/firefox/safari each render a
// different control, and the spinner buttons feel laggy on windows) ux:, the trigger is styled like an input, same height/border/radius, so it slots into forms without bespoke alignment work, clicking the trigger (or its clock icon) opens a popover with two scrollable columns: hours 00, 23 on the left, minutes 00, 59 on the right click an item to select, the popover stays open so users can set both halves in one trip, selected items use the same `bg, surface, tertiary` treatment used elsewhere for active states, no rings or borders, matching the design system the component is fully controlled, `value` is always "hh:mm" 24h and
// the consumer is responsible for any local↔utc conversion that keeps
// the picker free of timezone logic and matches how the rest of the
// codebase (e.g dream mode) shapes scheduling values
interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  // merged onto the trigger (width defaults to a compact 110px; height,
  // radius, padding and text size override cleanly)
  triggerClassName?: string;
  // `12` shows "02:30 PM" with an AM/PM column; `value` stays "HH:mm" 24h.
  // Default `24`.
  hourCycle?: 12 | 24;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const HOURS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const PERIODS = ["AM", "PM"];

type Period = "AM" | "PM";

/** "14" → { hour: "02", period: "PM" }; "00" → { hour: "12", period: "AM" }. */
function toTwelveHour(hour: string): { hour: string; period: Period } {
  const h = Number(hour);
  return {
    hour: String(((h + 11) % 12) + 1).padStart(2, "0"),
    period: h < 12 ? "AM" : "PM",
  };
}

/** "02" + "PM" → "14"; "12" + "AM" → "00". */
function toTwentyFourHour(hour: string, period: Period): string {
  return String((Number(hour) % 12) + (period === "PM" ? 12 : 0)).padStart(
    2,
    "0",
  );
}

function parseValue(value: string): { hour: string; minute: string } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (match) {
    const hour = match[1];
    const minute = match[2];
    if (hour !== undefined && minute !== undefined) {
      return { hour, minute };
    }
  }
  return { hour: "00", minute: "00" };
}

const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      className,
      disabled,
      ariaLabel,
      triggerClassName,
      hourCycle = 24,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const { hour, minute } = parseValue(value);
    const twelve = toTwelveHour(hour);
    const isTwelveHour = hourCycle === 12;

    const handleHourSelect = (h: string) => {
      const next = isTwelveHour ? toTwentyFourHour(h, twelve.period) : h;
      onChange(`${next}:${minute}`);
    };
    const handlePeriodSelect = (p: string) => {
      const period: Period = p === "PM" ? "PM" : "AM";
      onChange(`${toTwentyFourHour(twelve.hour, period)}:${minute}`);
    };
    const handleMinuteSelect = (m: string) => {
      onChange(`${hour}:${m}`);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              pickerTriggerClass,
              "w-[110px]",
              triggerClassName,
              className,
            )}
          >
            <span>
              {isTwelveHour
                ? `${twelve.hour}:${minute} ${twelve.period}`
                : `${hour}:${minute}`}
            </span>
            <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={4}
          className="flex w-auto gap-1 p-2"
        >
          <TimeColumn
            label="Hours"
            values={isTwelveHour ? HOURS_12 : HOURS}
            selected={isTwelveHour ? twelve.hour : hour}
            onSelect={handleHourSelect}
          />
          <TimeColumn
            label="Minutes"
            values={MINUTES}
            selected={minute}
            onSelect={handleMinuteSelect}
          />
          {isTwelveHour ? (
            <TimeColumn
              label="AM/PM"
              values={PERIODS}
              selected={twelve.period}
              onSelect={handlePeriodSelect}
            />
          ) : null}
        </PopoverContent>
      </Popover>
    );
  },
);
TimePicker.displayName = "TimePicker";

interface TimeColumnProps {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}

// Centres the selected item when the column mounts. The column lives inside
// the popover content, which mounts after the trigger's open state changes,
// so the scroll has to run here rather than in the picker. It sets the
// column's own `scrollTop`, so the page never scrolls.
function TimeColumn({ label, values, selected, onSelect }: TimeColumnProps) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector(`[data-time-value="${selected}"]`);
    if (!list || !(item instanceof HTMLElement)) return;
    list.scrollTop =
      item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2;
    // Mount only: re-centring on every pick would jump the list under the pointer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex w-14 flex-col" data-time-column={label}>
      <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        ref={listRef}
        className="relative h-48 overflow-y-auto rounded-lg bg-segment py-1"
      >
        {values.map((v) => {
          const isSelected = v === selected;
          return (
            <button
              key={v}
              type="button"
              data-time-value={v}
              onClick={() => onSelect(v)}
              className={cn(
                "flex h-7 w-full items-center justify-center text-xs tabular-nums transition-colors",
                isSelected
                  ? pickerSelectedClass
                  : cn("text-foreground/80", pickerItemHoverClass),
              )}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { TimePicker };
