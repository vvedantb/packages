"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { useCn, useUiConfig } from "./ui-config";

type InputGroupAlign = "inline-start" | "inline-end" | "block-start" | "block-end";
type InputGroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";

/** `UiConfig.InputGroup`: each given class string replaces the built-in one. */
export interface InputGroupConfig {
  classes?: {
    root?: string;
    addon?: { base?: string; align?: Partial<Record<InputGroupAlign, string>> };
    button?: { base?: string; size?: Partial<Record<InputGroupButtonSize, string>> };
    text?: string;
    input?: string;
    textarea?: string;
  };
}

const inputGroupRootClasses = [
  "group/input-group relative flex w-full flex-wrap items-center rounded-field border border-border bg-field-background text-sm transition-[border-color,box-shadow] duration-200 ease-smooth outline-hidden",
  "h-10 min-w-0 has-[>textarea]:h-auto",
  "[&>input]:has-[>[data-align=inline-start]]:pl-2",
  "[&>input]:has-[>[data-align=inline-end]]:pr-2",
  "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col [&>input]:has-[>[data-align=block-start]]:pb-3",
  "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col [&>input]:has-[>[data-align=block-end]]:pt-3",
  "has-[[data-slot=input-group-control]:focus-visible]:border-focus-border has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot=input-group-control]:focus-visible]:ring-focus-ring",
  "has-[[data-slot][aria-invalid=true]]:border-danger-border has-[[data-slot][aria-invalid=true]]:ring-danger-ring",
];

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  const root = useUiConfig("InputGroup")?.classes?.root;
  const merge = useCn();
  return (
    <div
      data-slot="input-group"
      role="group"
      className={merge(root ?? inputGroupRootClasses, className)}
      {...props}
    />
  );
}

const inputGroupAddonBaseClasses =
  "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-md group-data-[disabled=true]/input-group:opacity-50";

const inputGroupAddonAlignClasses = {
  "inline-start":
    "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
  "inline-end":
    "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
  "block-start":
    "order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5",
  "block-end":
    "order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5",
};

const inputGroupAddonVariants = cva(inputGroupAddonBaseClasses, {
  variants: {
    align: inputGroupAddonAlignClasses,
  },
  defaultVariants: {
    align: "inline-start",
  },
});

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  const classes = useUiConfig("InputGroup")?.classes?.addon;
  const merge = useCn();
  const a = align ?? "inline-start";
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={
        classes
          ? merge(
              classes.base ?? inputGroupAddonBaseClasses,
              classes.align?.[a] ?? inputGroupAddonAlignClasses[a],
              className,
            )
          : merge(inputGroupAddonVariants({ align }), className)
      }
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonBaseClasses = "text-sm shadow-none flex gap-2 items-center";

const inputGroupButtonSizeClasses = {
  xs: "h-7 gap-1 rounded-lg px-2 text-xs [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2",
  sm: "h-8 rounded-lg px-2.5 gap-1.5 text-xs has-[>svg]:px-2.5",
  "icon-xs": "size-7 rounded-lg p-0 has-[>svg]:p-0",
  "icon-sm": "size-8 rounded-lg p-0 has-[>svg]:p-0",
};

const inputGroupButtonVariants = cva(inputGroupButtonBaseClasses, {
  variants: {
    size: inputGroupButtonSizeClasses,
  },
  defaultVariants: {
    size: "xs",
  },
});

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  const classes = useUiConfig("InputGroup")?.classes?.button;
  const merge = useCn();
  const s = size ?? "xs";
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={
        classes
          ? merge(
              classes.base ?? inputGroupButtonBaseClasses,
              classes.size?.[s] ?? inputGroupButtonSizeClasses[s],
              className,
            )
          : merge(inputGroupButtonVariants({ size }), className)
      }
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  const base = useUiConfig("InputGroup")?.classes?.text;
  const merge = useCn();
  return (
    <span
      className={merge(
        base ??
          "text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const base = useUiConfig("InputGroup")?.classes?.input;
  const merge = useCn();
  return (
    <Input
      data-slot="input-group-control"
      className={merge(
        base ??
          "flex-1 rounded-none border-0 bg-transparent shadow-none focus:outline-hidden focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  const base = useUiConfig("InputGroup")?.classes?.textarea;
  const merge = useCn();
  return (
    <Textarea
      data-slot="input-group-control"
      className={merge(
        base ??
          "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus:outline-hidden focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
