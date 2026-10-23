import * as React from "react";
import { cn } from "../utils/cn";
import { fieldFocusClass } from "./_field-classes";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full max-sm:min-w-0 rounded-field border border-border bg-field-background px-3.5 py-2.5 text-base sm:text-sm placeholder:text-field-placeholder disabled:cursor-not-allowed disabled:opacity-50",
        fieldFocusClass,
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
