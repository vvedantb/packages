"use client";
import * as React from "react";
import { fieldFocusClass } from "./_field-classes";
import { ClearInput, type ClearInputProps } from "./clear-input";

const altClasses = {
  wrapper: "relative",
  input: `flex h-10 w-full rounded-field border border-border bg-field-background px-3.5 py-2 text-sm transition-[border-color,background-color] duration-200 ease-smooth placeholder:text-field-placeholder disabled:cursor-not-allowed disabled:opacity-50 ${fieldFocusClass}`,
  button:
    "absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-[opacity,background-color,color,transform] duration-150 ease-out active:duration-100 active:ease-out active:scale-[0.97] hover:bg-surface-tertiary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring before:absolute before:inset-[-8px] before:content-['']",
};

/**
 * The `Alt` look on `ClearInput`'s `animation="none"` path: the clear button
 * stays mounted (`clearButton="always"`), per-instance `classes` replace the
 * main classes (and any `UiConfig.ClearInput` entry), and an explicit
 * `placeholder={undefined}` keeps the input free of the main `placeholder=""`.
 *
 * @deprecated Use `ClearInput`. Kept for existing consumers; removed in a later minor after they move.
 */
const ClearInputAlt = React.forwardRef<
  HTMLInputElement,
  Omit<ClearInputProps, "animation" | "clearButton" | "classes">
>(({ placeholder, ...props }, ref) => (
  <ClearInput
    ref={ref}
    animation="none"
    clearButton="always"
    classes={altClasses}
    placeholder={placeholder}
    {...props}
  />
));
ClearInputAlt.displayName = "ClearInputAlt";

export { ClearInputAlt };
