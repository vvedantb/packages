import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../src/utils/cn";

/**
 * The trough of a `ButtonTrack`: the `Sidebar.RailGroup` tone as a row.
 * Buttons on it are flat (the trough is their surface) and hover at half the
 * pill tone. Empty, it takes no space.
 */
export const buttonTrackClass =
  "flex shrink-0 items-center gap-0.5 rounded-xl bg-default p-0.5 empty:hidden [&_button]:bg-transparent [&_button:not([data-active]):not(:disabled):hover]:bg-segment/50";

export type ButtonTrackProps = ComponentPropsWithoutRef<"div"> & {
  /** `"column"` stacks the buttons from `md` up (a side rail). Default `"row"`. */
  direction?: "row" | "column";
};

/** A group of icon buttons on one trough, for example the actions of a page header. */
export function ButtonTrack({ direction = "row", className, ...props }: ButtonTrackProps) {
  return (
    <div
      role="group"
      {...props}
      className={cn(buttonTrackClass, direction === "column" ? "gap-1 md:flex-col" : "flex-wrap justify-end", className)}
    />
  );
}
