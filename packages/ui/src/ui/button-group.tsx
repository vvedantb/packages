import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { Separator } from "./separator";
import { useCn, useUiConfig } from "./ui-config";

/** `UiConfig.ButtonGroup`: each given class string replaces the built-in one. */
export interface ButtonGroupConfig {
  classes?: {
    base?: string;
    orientation?: Partial<Record<"horizontal" | "vertical", string>>;
    text?: string;
    separator?: string;
  };
}

const buttonGroupBaseClasses =
  "flex w-fit items-stretch focus-visible:*:z-10 focus-visible:*:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 [&>[data-slot=select-trigger]:last-of-type]:has-[select[aria-hidden=true]:last-child]:rounded-r-md has-[>[data-slot=button-group]]:gap-2";

const buttonGroupOrientationClasses = {
  horizontal:
    "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
  vertical:
    "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
};

const buttonGroupVariants = cva(buttonGroupBaseClasses, {
  variants: {
    orientation: buttonGroupOrientationClasses,
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  const classes = useUiConfig("ButtonGroup")?.classes;
  const merge = useCn();
  const o = orientation ?? "horizontal";
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={
        classes
          ? merge(
              classes.base ?? buttonGroupBaseClasses,
              classes.orientation?.[o] ?? buttonGroupOrientationClasses[o],
              className,
            )
          : merge(buttonGroupVariants({ orientation }), className)
      }
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "div";
  const base = useUiConfig("ButtonGroup")?.classes?.text;
  const merge = useCn();

  return (
    <Comp
      className={merge(
        base ??
          "bg-surface-secondary flex items-center gap-2 rounded-md px-4 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  const base = useUiConfig("ButtonGroup")?.classes?.separator;
  const merge = useCn();
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={merge(
        base ??
          "bg-separator relative m-0! self-stretch data-[orientation=vertical]:h-auto",
        className,
      )}
      {...props}
    />
  );
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
};
