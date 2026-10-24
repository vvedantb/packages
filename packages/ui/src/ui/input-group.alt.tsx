"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { fieldFocusWithinClass } from "./_field-classes";
import { Button, type ButtonProps } from "./button";
import {
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";

// The `Alt` look on the main parts: per-instance `classes` replace the main
// classes (and any `UiConfig.InputGroup` entry), and `role` / `data-slot`
// set to `undefined` drop the main attributes, so the markup is the
// pre-wrapper one. Two parts cannot go through the main ones without changing
// their markup: the root puts `data-input-group` (the addon's focus hook)
// before `class`, and the button has no default `type`; they stay a plain
// `<div>` and a `Button`.

/** @deprecated Use `InputGroup`. Kept for existing consumers; removed in a later minor after they move. */
const InputGroupAlt = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <div
    ref={ref}
    data-input-group=""
    className={cn(
      "flex h-10 flex-wrap rounded-field border border-border bg-field-background text-sm transition-[border-color,box-shadow] duration-200 ease-smooth",
      "has-[textarea]:h-auto",
      "has-data-[slot=input-group-control]:h-auto",
      "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col",
      fieldFocusWithinClass,
      error &&
        "border-danger-border has-focus-visible:border-danger has-focus-visible:ring-danger-ring",
      className,
    )}
    {...props}
  />
));
InputGroupAlt.displayName = "InputGroupAlt";

const addonClasses = {
  addon: {
    base: "flex items-center",
    align: {
      "inline-start": "flex-row ps-3",
      "inline-end": "flex-row pe-3",
      "block-start": "w-full flex-row border-b border-separator px-3 py-2",
      "block-end": "w-full flex-row px-3 py-2",
    },
  },
};

/** `align={null}` (allowed by the old variant props) adds no align classes. */
const addonClassesNoAlign = { addon: { base: "flex items-center", align: { "inline-start": "" } } };

/** Focuses the group's first textarea or input (the click target of an addon). */
function focusGroupField(event: React.MouseEvent<HTMLDivElement>) {
  const group = event.currentTarget.closest("[data-input-group]");
  const field = group?.querySelector("textarea, input");
  if (field instanceof HTMLElement) field.focus();
}

/** @deprecated Use `InputGroupAddon`. Kept for existing consumers; removed in a later minor after they move. */
function InputGroupAddonAlt({
  align,
  onClick,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end" | "block-start" | "block-end" | null;
}) {
  return (
    <InputGroupAddon
      role={undefined}
      data-slot={undefined}
      align={align}
      data-align={align ?? undefined}
      classes={align === null ? addonClassesNoAlign : addonClasses}
      onClick={onClick ?? focusGroupField}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva("shrink-0 shadow-none", {
  variants: {
    size: {
      xs: "h-7 rounded-lg px-2 text-xs",
      sm: "h-8 rounded-lg px-2.5 text-xs",
      "icon-xs": "h-7 w-7 rounded-lg",
      "icon-sm": "h-8 w-8 rounded-lg",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

/** @deprecated Use `InputGroupButton`. Kept for existing consumers; removed in a later minor after they move. */
const InputGroupButtonAlt = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & VariantProps<typeof inputGroupButtonVariants>
>(({ className, size, variant = "ghost", ...props }, ref) => (
  <Button
    ref={ref}
    variant={variant}
    className={cn(inputGroupButtonVariants({ size }), className)}
    {...props}
  />
));
InputGroupButtonAlt.displayName = "InputGroupButtonAlt";

const textClasses = { text: "flex items-center text-sm text-muted-foreground/95" };

/** @deprecated Use `InputGroupText`. Kept for existing consumers; removed in a later minor after they move. */
function InputGroupTextAlt(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <InputGroupText classes={textClasses} {...props} />;
}

const inputClasses = {
  input:
    "h-full flex-1 rounded-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:border-0 focus-visible:ring-0",
};

/** @deprecated Use `InputGroupInput`. Kept for existing consumers; removed in a later minor after they move. */
function InputGroupInputAlt(props: React.ComponentProps<"input">) {
  return <InputGroupInput data-slot={undefined} classes={inputClasses} {...props} />;
}

const textareaClasses = {
  textarea:
    "flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:border-0 focus-visible:ring-0 field-sizing-content",
};

/** @deprecated Use `InputGroupTextarea`. Kept for existing consumers; removed in a later minor after they move. */
function InputGroupTextareaAlt(props: React.ComponentProps<"textarea">) {
  return <InputGroupTextarea data-slot={undefined} classes={textareaClasses} {...props} />;
}

export {
  InputGroupAlt,
  InputGroupAddonAlt,
  InputGroupButtonAlt,
  InputGroupTextAlt,
  InputGroupInputAlt,
  InputGroupTextareaAlt,
};
