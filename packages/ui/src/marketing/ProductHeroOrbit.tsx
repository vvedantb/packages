import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export type ProductHeroOrbitProps = {
  /**
   * Any CSS colour. It tints the glow, the rings and the dots, so each product gets its own
   * hue from one drawing. Default: the foreground colour.
   */
  accent?: string;
  /** Optional mark in the core, for example the product logo. It is centred and keeps the foreground colour. */
  children?: ReactNode;
  className?: string;
};

const ringClass = "absolute rounded-full border border-current/25 animate-spin motion-reduce:animate-none";
const dotClass = "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current";

/**
 * The default concept visual for `ProductHero`: a glowing core with three orbit rings, in the
 * style of https://projectv.uk. Pass it as `visual`. A product sets `accent` instead of drawing
 * its own visual.
 *
 * All motion is CSS (`animate-spin`, `animate-pulse`) and stops under `prefers-reduced-motion: reduce`.
 * Each ring has a fixed start angle, so the still version does not stack the dots.
 */
export function ProductHeroOrbit({ accent, children, className }: ProductHeroOrbitProps) {
  return (
    <div
      data-testid="product-hero-orbit"
      className={cn("relative aspect-square w-full max-w-sm text-foreground", className)}
      style={accent === undefined ? undefined : { color: accent }}
    >
      <span className="absolute inset-[24%] rounded-full bg-current/30 blur-2xl animate-pulse [animation-duration:5s] motion-reduce:animate-none" />
      <span className={cn(ringClass, "inset-[2%] border-dashed rotate-[130deg] [animation-duration:48s]")}>
        <span className={cn(dotClass, "size-2 opacity-60")} />
      </span>
      <span className={cn(ringClass, "inset-[15%] rotate-[250deg] [animation-direction:reverse] [animation-duration:30s]")}>
        <span className={cn(dotClass, "size-2.5 opacity-80")} />
      </span>
      <span className={cn(ringClass, "inset-[29%] border-current/40 rotate-[40deg] [animation-duration:16s]")}>
        <span className={cn(dotClass, "size-3")} />
      </span>
      <span className="absolute inset-[40%] flex items-center justify-center rounded-full bg-current/15 ring-1 ring-current/40 shadow-[0_0_48px_8px] shadow-current/30">
        {children ? <span className="flex items-center justify-center text-foreground">{children}</span> : null}
      </span>
    </div>
  );
}
