import { IconLoader2 } from "@tabler/icons-react";
import { bindRuntimeAnimation } from "../utils/runtimeVisibility";
import { useCn, useUiConfig } from "./ui-config";

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

/** One outline of a {@link SpinnerMark}: a `<polygon>` (`points`) or a `<path>` (`d`). */
export type SpinnerMarkShape =
  | { points: string; stroke: string }
  | { d: string; stroke: string };

/**
 * A logo (or any outline) drawn as strokes, with a dash that runs around each
 * shape forever. Each shape gets `pathLength=1`, so `dashArray` is a fraction
 * of its perimeter (`"0.28 0.72"`: a dash over 28% of the outline).
 */
export interface SpinnerMark {
  viewBox: string;
  shapes: readonly SpinnerMarkShape[];
  strokeWidth: number;
  dashArray: string;
}

export interface SpinnerConfig {
  /** Default for the `mark` prop: every `<Spinner />` draws this mark. */
  mark?: SpinnerMark;
}

export type SpinnerProps = Omit<React.ComponentPropsWithoutRef<"svg">, "size" | "stroke"> & {
  /** Named size (a `size-*` class) or a pixel size passed to the icon (no size class). Default `"md"`. */
  size?: "sm" | "md" | "lg" | number;
  /** Icon stroke width. Default the icon's own (2). Not used with `mark`. */
  stroke?: number | string;
  /** `"muted"` adds `text-muted-foreground`; `"inherit"` adds no colour class, so the icon uses `currentColor`. Default `"muted"`. Not used with `mark`. */
  tone?: "muted" | "inherit";
  /** Hide from assistive tech (`aria-hidden`, no `role="status"` or label), e.g. inside a labelled button. Default `false`. */
  decorative?: boolean;
  /** Draw this outline with a running dash instead of the loader icon. Default `UiConfig.Spinner.mark`, else none. */
  mark?: SpinnerMark;
};

/**
 * Runs the dash around one shape: `stroke-dashoffset` 0 → -1 over 2s, forever,
 * against `pathLength=1`. Web Animations rather than SMIL `<animate>`: SMIL
 * ticks each shape's animated attribute on its own (a style recalc per shape
 * per frame); WAAPI folds into the frame's single recalc and needs no app
 * keyframes. {@link bindRuntimeAnimation} pauses it while the tab is hidden or
 * the shape is off screen. Module-level so the ref identity is stable across
 * renders; React 19 runs the returned cleanup on detach.
 */
function traceDash(shape: SVGGeometryElement | null): (() => void) | undefined {
  if (!shape) return undefined;
  const trace = shape.animate(
    [{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }],
    { duration: 2000, iterations: Infinity },
  );
  return bindRuntimeAnimation(shape, trace);
}

function MarkSpinner({
  mark,
  size = "md",
  decorative = false,
  className,
  ...props
}: Omit<SpinnerProps, "mark" | "stroke" | "tone"> & { mark: SpinnerMark }) {
  const pixels = typeof size === "number" ? size : undefined;
  const merge = useCn();
  return (
    <svg
      viewBox={mark.viewBox}
      {...(decorative ? { "aria-hidden": true } : { role: "status", "aria-label": "Loading" })}
      width={pixels}
      height={pixels}
      className={merge(typeof size === "number" ? undefined : sizeClasses[size], className)}
      {...props}
    >
      {mark.shapes.map((shape, i) =>
        "points" in shape ? (
          <polygon
            key={i}
            ref={traceDash}
            points={shape.points}
            fill="none"
            stroke={shape.stroke}
            strokeWidth={mark.strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={mark.dashArray}
          />
        ) : (
          <path
            key={i}
            ref={traceDash}
            d={shape.d}
            fill="none"
            stroke={shape.stroke}
            strokeWidth={mark.strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={mark.dashArray}
          />
        ),
      )}
    </svg>
  );
}

function Spinner({ mark, ...rest }: SpinnerProps) {
  const config = useUiConfig("Spinner");
  const merge = useCn();
  const resolvedMark = mark ?? config?.mark;
  if (resolvedMark) {
    const { stroke: _stroke, tone: _tone, ...props } = rest;
    return <MarkSpinner mark={resolvedMark} {...props} />;
  }
  const { size = "md", tone = "muted", decorative = false, className, ...props } = rest;
  return (
    <IconLoader2
      {...(decorative ? { "aria-hidden": true } : { role: "status", "aria-label": "Loading" })}
      size={typeof size === "number" ? size : undefined}
      className={merge(
        "animate-spin",
        tone === "muted" && "text-muted-foreground",
        typeof size === "number" ? undefined : sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

/** Stroke colours of {@link CircleSpinner}. Each defaults to `currentColor`. */
export interface CircleSpinnerColors {
  /** The faint full ring (drawn at 20% opacity). */
  track?: string;
  /** The longer arc. */
  arc?: string;
  /** The shorter arc drawn over the leading half of `arc`. */
  lead?: string;
}

export interface CircleSpinnerConfig {
  /** Default for the `colors` prop. */
  colors?: CircleSpinnerColors;
}

export type CircleSpinnerProps = React.ComponentPropsWithoutRef<"svg"> & {
  size?: "sm" | "md" | "lg";
  /** Stroke colours. Default `UiConfig.CircleSpinner.colors`, else `currentColor`. */
  colors?: CircleSpinnerColors;
};

/**
 * Rotates the arc around the viewBox centre, forever. Web Animations rather
 * than a CSS class: WAAPI gives {@link bindRuntimeAnimation} a handle to pause
 * the loop while the tab is hidden or the spinner is off screen, which a CSS
 * `animate-spin` cannot offer. Module-level so the ref identity is stable.
 */
function spinArc(arc: SVGGElement): () => void {
  const spin = arc.animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    { duration: 900, iterations: Infinity, easing: "linear" },
  );
  return bindRuntimeAnimation(arc, spin);
}

/**
 * Circular spinner: a faint full ring with a two-tone arc sweeping around it.
 * For small slots (inline buttons, menu rows) where a {@link Spinner} mark is
 * too small to read.
 *
 * The arc is two circles rather than one gradient stroke: a gradient only
 * samples the slice of its box the arc crosses, so at 12–16px one end washes
 * out. Drawing `lead` over the leading half of a longer `arc` dash keeps both
 * colours legible at every size, and needs no per-instance gradient id.
 */
function CircleSpinner({ size = "md", colors, className, ...props }: CircleSpinnerProps) {
  const config = useUiConfig("CircleSpinner");
  const merge = useCn();
  const { track = "currentColor", arc = "currentColor", lead = "currentColor" } =
    colors ?? config?.colors ?? {};
  return (
    <svg
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
      className={merge(sizeClasses[size], className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke={track} strokeWidth={3} opacity={0.2} />
      <g ref={spinArc} style={{ transformBox: "view-box", transformOrigin: "12px 12px" }}>
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke={arc}
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.36 0.64"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke={lead}
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.18 0.82"
        />
      </g>
    </svg>
  );
}

export { CircleSpinner, Spinner };
