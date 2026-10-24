"use client";
import { type CSSProperties, type ElementType } from "react";
import { motion } from "motion/react";
import { cn } from "../utils/cn";
import { useAnimOffscreenRef } from "../utils/runtimeVisibility";
import { useCn, useUiConfig } from "../ui/ui-config";
interface ShimmerCSSProperties extends CSSProperties {
  "--spread"?: string;
  "--bg"?: string;
}
/** Custom properties the `mask` sweep reads from the app's `.shimmer-*` CSS. */
interface ShimmerMaskStyle extends CSSProperties {
  "--shimmer-spread": string;
  "--shimmer-duration": string;
}
/**
 * `UiConfig.Shimmer`. `mode: "mask"` sweeps a masked copy of the text on the
 * compositor (no repaint per frame, paused offscreen) instead of animating a
 * `background-position`. The app defines the `overlay`, `band` and `copy`
 * classes (default `shimmer-overlay`, `shimmer-band`, `shimmer-copy`).
 */
export interface ShimmerConfig {
  mode?: "gradient" | "mask";
  /** Default element. */
  as?: ElementType;
  classes?: {
    /** Root element in `mask` mode. */
    base?: string;
    overlay?: string;
    band?: string;
    copy?: string;
  };
}
interface ShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
  /** `"mask"`: compositor sweep, see `ShimmerConfig`. Default `"gradient"`. */
  mode?: "gradient" | "mask";
}
function Shimmer({ mode, as, ...props }: ShimmerProps) {
  const config = useUiConfig("Shimmer");
  const Component = as ?? config?.as ?? "span";
  return (mode ?? config?.mode) === "mask" ? (
    <MaskShimmer as={Component} {...props} />
  ) : (
    <GradientShimmer as={Component} {...props} />
  );
}
function GradientShimmer({
  children,
  as: Component = "span",
  className,
  duration = 2,
  spread = 2,
}: ShimmerProps) {
  const MotionComponent = motion.create(Component);
  const totalSpread = spread * children.length;
  const style = {
    "--spread": `${totalSpread}px`,
    "--bg": `linear-gradient(
            90deg,
            var(--color-muted-foreground, var(--muted)) 0%,
            var(--color-foreground, var(--foreground)) calc(50% - var(--spread)),
            var(--color-muted-foreground, var(--muted)) 50%,
            var(--color-foreground, var(--foreground)) calc(50% + var(--spread)),
            var(--color-muted-foreground, var(--muted)) 100%
          )`,
    backgroundImage: "var(--bg)",
    backgroundSize: "200% 100%",
  } satisfies ShimmerCSSProperties;
  return (
    <MotionComponent
      className={cn(
        "inline-block bg-clip-text text-transparent [-webkit-text-fill-color:transparent]",
        className,
      )}
      style={style}
      animate={{ backgroundPosition: ["100% center", "0% center"] }}
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </MotionComponent>
  );
}
/**
 * The text renders once in the base colour; a copy in the highlight colour
 * sits over it, masked to a soft band. The band translates one way while the
 * copy inside it translates the other by the same amount, so only the mask
 * moves: two transform animations, no repaint. The copy is `aria-hidden`.
 */
function MaskShimmer({
  children,
  as: Component = "span",
  className,
  duration = 2,
  spread = 2,
}: ShimmerProps) {
  const classes = useUiConfig("Shimmer")?.classes;
  const merge = useCn();
  const setOffscreen = useAnimOffscreenRef<HTMLElement>();
  const style: ShimmerMaskStyle = {
    "--shimmer-spread": `${children.length * spread}px`,
    "--shimmer-duration": `${duration}s`,
  };
  return (
    <Component
      ref={setOffscreen}
      className={merge(classes?.base ?? "relative inline-block text-muted-foreground", className)}
      style={style}
    >
      {children}
      <span aria-hidden="true" data-anim-chrome="" className={classes?.overlay ?? "shimmer-overlay"}>
        <span className={classes?.band ?? "shimmer-band"}>
          <span className={classes?.copy ?? "shimmer-copy"}>{children}</span>
        </span>
      </span>
    </Component>
  );
}
export { Shimmer, type ShimmerProps };
