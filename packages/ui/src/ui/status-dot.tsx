import type { HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn";
import { useUiConfig } from "./ui-config";

export type StatusTone =
  | "progress"
  | "business-review"
  | "code-review"
  | "done"
  | "cancelled"
  /**
   * Live/online/enabled. Distinct from `done`: this is a *state* something is
   * currently in, not a workflow stage it has reached.
   */
  | "active"
  /** Something is wrong and needs attention: a critical finding, a hard error. */
  | "critical"
  | "neutral";

export interface StatusDotConfig {
  /** Replaces the built-in classes of a part. */
  classes?: {
    /** Fill class per tone. A tone left out keeps its built-in class. */
    tone?: Partial<Record<StatusTone, string>>;
  };
}

// Plain Record so Tailwind's static-class scanner can see every literal
// class here — a computed `bg-${tone}` string would not survive the purge.
const TONE_CLASS: Record<StatusTone, string> = {
  progress: "bg-warning",
  "business-review": "bg-primary",
  "code-review": "bg-primary/70",
  done: "bg-success",
  cancelled: "bg-muted-foreground/40",
  active: "bg-success",
  critical: "bg-destructive",
  neutral: "bg-muted-foreground/60",
};

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "size-1.5",
  md: "size-2",
};

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  /** Slightly larger dot for detail views. Default "sm". */
  size?: "sm" | "md";
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Linear-style status glyph: a small coloured dot that carries the status,
 * so the label next to it can stay neutral text instead of a coloured pill.
 *
 * `ref` is load-bearing: call sites make the dot the tooltip anchor via
 * `<TooltipTrigger asChild>`, and Radix composes its ref onto that child to
 * position the popper.
 */
export function StatusDot({
  tone,
  size = "sm",
  className,
  ref,
  "aria-hidden": ariaHidden = true,
  ...props
}: StatusDotProps) {
  const config = useUiConfig("StatusDot");
  return (
    <span
      ref={ref}
      aria-hidden={ariaHidden}
      className={cn(
        "rounded-full shrink-0",
        SIZE_CLASS[size],
        config?.classes?.tone?.[tone] ?? TONE_CLASS[tone],
        className,
      )}
      {...props}
    />
  );
}
