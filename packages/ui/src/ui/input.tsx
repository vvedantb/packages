import * as React from "react";
import { fieldFocusClass } from "./_field-classes";
import { useCn, useUiConfig } from "./ui-config";

/** `UiConfig.Input`: `classes.base` replaces the built-in field classes. */
export interface InputConfig {
  classes?: { base?: string };
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const base = useUiConfig("Input")?.classes?.base;
    const merge = useCn();
    return (
      <input
        type={type}
        className={merge(
          base ?? [
            "flex h-10 w-full max-sm:min-w-0 rounded-field border border-border bg-field-background px-3.5 py-2 text-base sm:text-sm transition-[border-color,box-shadow,background-color] duration-200 ease-smooth file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-field-placeholder disabled:cursor-not-allowed disabled:opacity-50",
            fieldFocusClass,
          ],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
