import * as React from "react";
import { cn } from "../utils/cn";

// `subtle`: plain filled key for inline hints; size and font come from the
// surrounding text.
const kbdVariantClasses = {
  default:
    "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md bg-surface-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
  subtle: "rounded bg-surface-secondary px-1.5 py-0.5 text-foreground",
};

export type KbdProps = React.HTMLAttributes<HTMLElement> & {
  /** Default `"default"`. */
  variant?: keyof typeof kbdVariantClasses;
};

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(kbdVariantClasses[variant], className)}
      {...props}
    />
  ),
);
Kbd.displayName = "Kbd";

export { Kbd };
