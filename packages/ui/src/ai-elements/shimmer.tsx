"use client";
import { type CSSProperties, type ElementType } from "react";
import { motion } from "motion/react";
import { cn } from "../utils/cn";
interface ShimmerCSSProperties extends CSSProperties {
  "--spread"?: string;
  "--bg"?: string;
}
interface ShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}
function Shimmer({
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
            var(--color-muted-foreground) 0%,
            var(--color-foreground) calc(50% - var(--spread)),
            var(--color-muted-foreground) 50%,
            var(--color-foreground) calc(50% + var(--spread)),
            var(--color-muted-foreground) 100%
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
export { Shimmer, type ShimmerProps };
