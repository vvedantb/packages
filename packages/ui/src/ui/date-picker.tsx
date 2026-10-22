import * as React from "react";
import {
  IconCalendar,
  IconCalendarMonth,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";
import type { Matcher } from "react-day-picker";
import { cn } from "../utils/cn";
import { assignRef } from "../utils/ref";
import {
  pickerFocusClass,
  pickerFieldClass,
  pickerItemHoverClass,
  pickerSelectedClass,
  pickerTriggerClass,
} from "./_picker-classes";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { TimePicker } from "./time-picker";

// controlled replacements for `<input type="date">`, `"datetime-local"` and
// `"month">`: the values are the native strings ("YYYY-MM-DD",
// "YYYY-MM-DDTHH:mm", "YYYY-MM", "" when empty), read and written as local
// calendar dates. there is no timezone logic; like TimePicker, the consumer
// owns any local↔utc conversion

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;
const DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

// "YYYY-MM-DD" -> local midnight, or undefined for "" and invalid dates
// (2025-02-30). never `new Date("YYYY-MM-DD")`, which parses as utc midnight
// and lands on the previous day west of greenwich
function parseDateValue(value: string): Date | undefined {
  const match = DATE_RE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  // setFullYear keeps years 0-99 literal (the Date constructor maps them to 19xx)
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

// local calendar date -> "YYYY-MM-DD" ("" for an invalid date)
function formatDateValue(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseMonthValue(
  value: string,
): { year: number; month: number } | undefined {
  const match = MONTH_RE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return undefined;
  return { year, month };
}

const formatMonthValue = (year: number, month: number) =>
  `${pad(year, 4)}-${pad(month + 1)}`;

function localDate(year: number, month: number): Date {
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month, 1);
  return date;
}

// wrapper, input-styled trigger, optional clear control and hidden input
// shared by DatePicker and MonthPicker. the clear control is a sibling of the
// trigger (buttons cannot nest), overlaid inside the field on the right, and
// hands focus back to the trigger. the trigger grows with the wrapper, so a
// width on either `className` or `triggerClassName` sizes the field
interface PickerFieldProps {
  triggerRef: React.Ref<HTMLButtonElement>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  text: string | undefined;
  placeholder: string;
  icon: React.ReactNode;
  clearLabel: string;
  onClear: () => void;
  clearable?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
  id?: string;
  name?: string;
  children: React.ReactNode;
}

function PickerField({
  triggerRef,
  open,
  onOpenChange,
  value,
  text,
  placeholder,
  icon,
  clearLabel,
  onClear,
  clearable,
  disabled,
  ariaLabel,
  className,
  triggerClassName,
  id,
  name,
  children,
}: PickerFieldProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const showClear = clearable && text !== undefined && !disabled;

  return (
    <div className={cn(pickerFieldClass, className)}>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            ref={(node) => {
              buttonRef.current = node;
              assignRef(triggerRef, node);
            }}
            id={id}
            type="button"
            disabled={disabled}
            aria-label={
              ariaLabel ? `${ariaLabel}, ${text ?? placeholder}` : undefined
            }
            className={cn(pickerTriggerClass, "w-40 min-w-0 grow", triggerClassName)}
          >
            <span
              className={cn(
                "truncate",
                text === undefined && "text-field-placeholder",
                showClear && "pr-7",
              )}
            >
              {text ?? placeholder}
            </span>
            {icon}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-auto p-2">
          {children}
        </PopoverContent>
      </Popover>
      {showClear ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            onClear();
            buttonRef.current?.focus();
          }}
          className={cn(
            "absolute right-8 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground",
            pickerFocusClass,
          )}
        >
          <IconX className="size-3" />
        </button>
      ) : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}

interface DatePickerProps {
  // "YYYY-MM-DD" or "" (what `<input type="date">` uses)
  value: string;
  onChange: (value: string) => void;
  // "YYYY-MM-DD"; days outside the range are disabled
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  // names the trigger; the shown date or placeholder is appended
  ariaLabel?: string;
  // the wrapper (trigger plus clear control)
  className?: string;
  // merged onto the trigger (default width `w-40`); `w-full`, height, radius,
  // padding and text size override cleanly
  triggerClassName?: string;
  // shows a clear control that calls `onChange("")`
  clearable?: boolean;
  // BCP 47 locale for the trigger text (default: the runtime's)
  locale?: string;
  id?: string;
  // renders a hidden input with `value` so forms still submit it
  name?: string;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      placeholder = "Pick a date",
      disabled,
      ariaLabel,
      className,
      triggerClassName,
      clearable,
      locale,
      id,
      name,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const selected = parseDateValue(value);
    const minDate = min ? parseDateValue(min) : undefined;
    const maxDate = max ? parseDateValue(max) : undefined;
    const outOfRange: Matcher[] = [
      ...(minDate ? [{ before: minDate }] : []),
      ...(maxDate ? [{ after: maxDate }] : []),
    ];

    return (
      <PickerField
        triggerRef={ref}
        open={open}
        onOpenChange={setOpen}
        value={value}
        text={
          selected
            ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                selected,
              )
            : undefined
        }
        placeholder={placeholder}
        icon={<IconCalendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        clearLabel="Clear date"
        onClear={() => onChange("")}
        clearable={clearable}
        disabled={disabled}
        ariaLabel={ariaLabel}
        className={className}
        triggerClassName={triggerClassName}
        id={id}
        name={name}
      >
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected ?? minDate}
          startMonth={minDate}
          endMonth={maxDate}
          disabled={outOfRange}
          autoFocus
          onSelect={(date) => {
            onChange(formatDateValue(date));
            setOpen(false);
          }}
        />
      </PickerField>
    );
  },
);
DatePicker.displayName = "DatePicker";

interface DateTimePickerProps {
  // "YYYY-MM-DDTHH:mm" or "" (what `<input type="datetime-local">` uses)
  value: string;
  onChange: (value: string) => void;
  // "YYYY-MM-DDTHH:mm"; only the date part limits the calendar
  min?: string;
  max?: string;
  // time used when a date is picked before any time (default "00:00")
  defaultTime?: string;
  disabled?: boolean;
  // names both triggers ("<label>, date" and "<label>, time")
  ariaLabel?: string;
  // the row; a width here (`w-full`) grows the date field, the time keeps 110px
  className?: string;
  // merged onto both triggers (height, radius, padding, text size); a width
  // applies to the date trigger only, the time keeps 110px
  triggerClassName?: string;
  // on the date trigger
  id?: string;
  // renders a hidden input with the combined value
  name?: string;
  locale?: string;
}

function splitDateTime(value: string): { date: string; time: string } {
  const match = DATE_TIME_RE.exec(value);
  if (!match) return { date: "", time: "" };
  return { date: match[1] ?? "", time: match[2] ?? "" };
}

const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      defaultTime = "00:00",
      disabled,
      ariaLabel,
      className,
      triggerClassName,
      id,
      name,
      locale,
    },
    ref,
  ) => {
    const { date, time } = splitDateTime(value);

    return (
      <div className={cn(pickerFieldClass, "items-center gap-2", className)}>
        <DatePicker
          className="min-w-0 grow"
          triggerClassName={triggerClassName}
          ref={ref}
          id={id}
          value={date}
          onChange={(next) => onChange(next ? `${next}T${time || defaultTime}` : "")}
          min={min?.slice(0, 10)}
          max={max?.slice(0, 10)}
          disabled={disabled}
          ariaLabel={ariaLabel ? `${ariaLabel}, date` : "Date"}
          locale={locale}
        />
        <TimePicker
          value={time || defaultTime}
          onChange={(next) =>
            onChange(`${date || formatDateValue(new Date())}T${next}`)
          }
          disabled={disabled}
          ariaLabel={ariaLabel ? `${ariaLabel}, time` : "Time"}
          className="shrink-0"
          triggerClassName={cn(triggerClassName, "w-[110px]")}
        />
        {name ? <input type="hidden" name={name} value={value} /> : null}
      </div>
    );
  },
);
DateTimePicker.displayName = "DateTimePicker";

interface MonthPickerProps {
  // "YYYY-MM" or "" (what `<input type="month">` uses)
  value: string;
  onChange: (value: string) => void;
  // "YYYY-MM"; months outside the range are disabled
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  // merged onto the trigger, as on DatePicker
  triggerClassName?: string;
  clearable?: boolean;
  locale?: string;
  id?: string;
  name?: string;
}

const MonthPicker = React.forwardRef<HTMLButtonElement, MonthPickerProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      placeholder = "Pick a month",
      disabled,
      ariaLabel,
      className,
      triggerClassName,
      clearable,
      locale,
      id,
      name,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const selected = parseMonthValue(value);

    return (
      <PickerField
        triggerRef={ref}
        open={open}
        onOpenChange={setOpen}
        value={value}
        text={
          selected
            ? new Intl.DateTimeFormat(locale, {
                month: "short",
                year: "numeric",
              }).format(localDate(selected.year, selected.month))
            : undefined
        }
        placeholder={placeholder}
        icon={
          <IconCalendarMonth className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        }
        clearLabel="Clear month"
        onClear={() => onChange("")}
        clearable={clearable}
        disabled={disabled}
        ariaLabel={ariaLabel}
        className={className}
        triggerClassName={triggerClassName}
        id={id}
        name={name}
      >
        <MonthGrid
          value={value}
          min={min}
          max={max}
          locale={locale}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PickerField>
    );
  },
);
MonthPicker.displayName = "MonthPicker";

interface MonthGridProps {
  value: string;
  min?: string;
  max?: string;
  locale?: string;
  onSelect: (value: string) => void;
}

// mounted only while the popover is open, so the shown year starts at the
// selected one (else the current year, kept inside min/max) on every open
function MonthGrid({ value, min, max, locale, onSelect }: MonthGridProps) {
  const minYear = parseMonthValue(min ?? "")?.year;
  const maxYear = parseMonthValue(max ?? "")?.year;
  const [year, setYear] = React.useState(() => {
    const initial =
      parseMonthValue(value)?.year ?? new Date().getFullYear();
    if (maxYear !== undefined && initial > maxYear) return maxYear;
    if (minYear !== undefined && initial < minYear) return minYear;
    return initial;
  });
  const short = new Intl.DateTimeFormat(locale, { month: "short" });
  const long = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const navClass = cn(
    "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
    pickerFocusClass,
  );

  return (
    <div className="flex w-56 flex-col gap-2 p-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous year"
          disabled={minYear !== undefined && year <= minYear}
          onClick={() => setYear(year - 1)}
          className={navClass}
        >
          <IconChevronLeft className="size-4" />
        </button>
        <div aria-live="polite" className="text-xs font-medium tabular-nums">
          {year}
        </div>
        <button
          type="button"
          aria-label="Next year"
          disabled={maxYear !== undefined && year >= maxYear}
          onClick={() => setYear(year + 1)}
          className={navClass}
        >
          <IconChevronRight className="size-4" />
        </button>
      </div>
      <div role="group" aria-label={String(year)} className="grid grid-cols-3 gap-1">
        {Array.from({ length: 12 }, (_, month) => {
          const monthValue = formatMonthValue(year, month);
          const date = localDate(year, month);
          const isSelected = monthValue === value;
          // "YYYY-MM" strings compare in calendar order
          const outOfRange =
            (!!min && monthValue < min) || (!!max && monthValue > max);
          return (
            <button
              key={month}
              type="button"
              aria-label={long.format(date)}
              aria-pressed={isSelected}
              disabled={outOfRange}
              data-month-value={monthValue}
              onClick={() => onSelect(monthValue)}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                pickerFocusClass,
                isSelected
                  ? pickerSelectedClass
                  : cn("text-foreground/80", pickerItemHoverClass),
              )}
            >
              {short.format(date)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export {
  DatePicker,
  DateTimePicker,
  MonthPicker,
  parseDateValue,
  formatDateValue,
};
export type { DatePickerProps, DateTimePickerProps, MonthPickerProps };
