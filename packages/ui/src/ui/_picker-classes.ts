// input-styled trigger shared by TimePicker and the date pickers
export const pickerTriggerClass =
  "inline-flex h-8 items-center justify-between gap-2 rounded-field border border-border bg-field-background px-2.5 text-xs font-medium tabular-nums transition-[border-color,box-shadow,background-color] duration-200 ease-smooth hover:bg-field-background/90 focus-visible:border-focus-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50";

// selected item in a picker popover (TimePicker columns, calendar days, months)
export const pickerSelectedClass = "bg-primary text-primary-foreground";

export const pickerItemHoverClass = "hover:bg-surface-tertiary/50";

export const pickerFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

// wrapper around a trigger and its siblings (clear control, second picker). it
// shrinks to the trigger, grows with a `w-*` className, and goes full width
// when a trigger inside is `w-full` (a percent width cannot resolve against a
// shrink-to-fit wrapper)
export const pickerFieldClass =
  "relative inline-flex max-w-full align-middle has-[.w-full]:flex has-[.w-full]:w-full";
