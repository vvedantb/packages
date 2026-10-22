import * as React from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  type Chevron,
  DayPicker,
  type Root,
  getDefaultClassNames,
} from "react-day-picker";
import { cn } from "../utils/cn";
import {
  pickerFocusClass,
} from "./_picker-classes";

// shadcn's v9 calendar on package tokens: no background of its own (it takes
// the popover or card surface it sits on), selected days use the picker
// active treatment, today gets a dot, outside days are muted and disabled
// days dimmed. day state lives on the cell (`data-selected`, `data-today`,
// ...), so the day button reads it through `group/day`
const navButtonClass = cn(
  "inline-flex size-(--cell-size) select-none items-center justify-center rounded-lg p-0 text-muted-foreground transition-colors hover:bg-surface-tertiary hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
  pickerFocusClass,
);

function CalendarRoot({
  className,
  rootRef,
  ...props
}: React.ComponentProps<typeof Root>) {
  return (
    <div data-slot="calendar" ref={rootRef} className={className} {...props} />
  );
}

function CalendarChevron({
  className,
  orientation,
}: React.ComponentProps<typeof Chevron>) {
  const iconClass = cn("size-4", className);
  if (orientation === "left") return <IconChevronLeft className={iconClass} />;
  if (orientation === "right") {
    return <IconChevronRight className={iconClass} />;
  }
  return <IconChevronDown className={iconClass} />;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar p-1 text-foreground [--cell-size:--spacing(8)]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(navButtonClass, defaultClassNames.button_previous),
        button_next: cn(navButtonClass, defaultClassNames.button_next),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-xs font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-field border border-border has-focus:border-focus-border has-focus:ring-2 has-focus:ring-focus-ring",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-overlay opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "select-none text-xs font-medium",
          captionLayout !== "label" &&
            "flex h-7 items-center gap-1 rounded-field pl-2 pr-1 [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        month_grid: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none text-[10px] font-normal uppercase tracking-wider text-muted-foreground",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "select-none text-[10px] text-muted-foreground",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          defaultClassNames.day,
        ),
        day_button: cn(
          "relative inline-flex size-(--cell-size) items-center justify-center rounded-lg text-xs tabular-nums text-foreground/80 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          pickerFocusClass,
          // today, outside and hover rules exclude selected days, so the
          // selected tone never depends on the order Tailwind emits rules in.
          // the today dot is `bg-current`: foreground, or primary-foreground
          // when selected
          "not-group-data-selected/day:enabled:hover:bg-surface-tertiary/50",
          "group-data-today/day:font-semibold group-data-today/day:not-group-data-selected/day:text-foreground group-data-today/day:after:absolute group-data-today/day:after:bottom-1 group-data-today/day:after:left-1/2 group-data-today/day:after:size-1 group-data-today/day:after:-translate-x-1/2 group-data-today/day:after:rounded-full group-data-today/day:after:bg-current",
          "group-data-outside/day:not-group-data-selected/day:text-muted-foreground",
          // spelled out (not built from pickerSelectedClass) so Tailwind's
          // scanner sees it
          "group-data-selected/day:bg-primary group-data-selected/day:text-primary-foreground",
          defaultClassNames.day_button,
        ),
        range_start: cn("rounded-l-lg", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-lg", defaultClassNames.range_end),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: CalendarRoot,
        Chevron: CalendarChevron,
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
