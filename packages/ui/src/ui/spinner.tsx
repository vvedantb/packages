import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "../utils/cn";

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

export type SpinnerProps = Omit<React.ComponentPropsWithoutRef<"svg">, "size" | "stroke"> & {
  /** Named size (a `size-*` class) or a pixel size passed to the icon (no size class). Default `"md"`. */
  size?: "sm" | "md" | "lg" | number;
  /** Icon stroke width. Default the icon's own (2). */
  stroke?: number | string;
  /** `"muted"` adds `text-muted-foreground`; `"inherit"` adds no colour class, so the icon uses `currentColor`. Default `"muted"`. */
  tone?: "muted" | "inherit";
  /** Hide from assistive tech (`aria-hidden`, no `role="status"` or label), e.g. inside a labelled button. Default `false`. */
  decorative?: boolean;
};

function Spinner({
  size = "md",
  tone = "muted",
  decorative = false,
  className,
  ...props
}: SpinnerProps) {
  return (
    <IconLoader2
      {...(decorative ? { "aria-hidden": true } : { role: "status", "aria-label": "Loading" })}
      size={typeof size === "number" ? size : undefined}
      className={cn(
        "animate-spin",
        tone === "muted" && "text-muted-foreground",
        typeof size === "number" ? undefined : sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export { Spinner };
