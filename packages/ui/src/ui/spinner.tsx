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

/** Stroke colours of the `circle` variant. Each defaults to `currentColor`. */
export interface SpinnerCircleColors {
  /** The faint full ring (drawn at 20% opacity). */
  track?: string;
  /** The longer arc. */
  arc?: string;
  /** The shorter arc drawn over the leading half of `arc`. */
  lead?: string;
}

export interface SpinnerConfig {
  /** Default for the `mark` prop: every `<Spinner />` without a `variant` draws this mark. */
  mark?: SpinnerMark;
  /** Default for the `colors` prop of the `circle` variant. */
  circle?: SpinnerCircleColors;
}

export type SpinnerProps = Omit<React.ComponentPropsWithoutRef<"svg">, "size" | "stroke"> & {
  /**
   * What to draw. Without it: the `mark` (prop, else `UiConfig.Spinner.mark`),
   * else the loader icon. An explicit `variant` wins over the configured mark.
   * - `"icon"`: the rotating loader icon.
   * - `"circle"`: a faint ring with a two-tone arc sweeping around it, for
   *   small slots (inline buttons, menu rows) where a mark is too small to read.
   * - `"ring"`: the `Button` loading ring, a fixed 16px (`h-4 w-4`) ring and arc
   *   in `currentColor`. Unlabelled (the button's `disabled` and `data-loading`
   *   carry the state); `size`, `tone`, `stroke` and `decorative` do not apply.
   */
  variant?: "icon" | "circle" | "ring";
  /** Named size (a `size-*` class) or a pixel size (`width`/`height`, no size class). Default `"md"`. Not used with `"ring"`. */
  size?: "sm" | "md" | "lg" | number;
  /** Icon stroke width. Default the icon's own (2). Only for `"icon"`. */
  stroke?: number | string;
  /** `"muted"` adds `text-muted-foreground`; `"inherit"` adds no colour class, so the icon uses `currentColor`. Default `"muted"`. Only for `"icon"`. */
  tone?: "muted" | "inherit";
  /** Hide from assistive tech (`aria-hidden`, no `role="status"` or label), e.g. inside a labelled button. Default `false`. Not used with `"ring"`. */
  decorative?: boolean;
  /** Draw this outline with a running dash instead of the loader icon. Default `UiConfig.Spinner.mark`, else none. Ignored with a `variant`. */
  mark?: SpinnerMark;
  /** Stroke colours of the `"circle"` variant. Default `UiConfig.Spinner.circle`, else `currentColor`. */
  colors?: SpinnerCircleColors;
};

/** Props every variant renderer takes: the svg props plus the shared ones. */
type VariantProps = Omit<SpinnerProps, "variant" | "mark" | "stroke" | "tone" | "colors">;

function a11yProps(decorative: boolean) {
  return decorative ? { "aria-hidden": true } : { role: "status", "aria-label": "Loading" };
}

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
}: VariantProps & { mark: SpinnerMark }) {
  const pixels = typeof size === "number" ? size : undefined;
  const merge = useCn();
  return (
    <svg
      viewBox={mark.viewBox}
      {...a11yProps(decorative)}
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
 * The `circle` variant: a faint full ring with a two-tone arc sweeping around it.
 *
 * The arc is two circles rather than one gradient stroke: a gradient only
 * samples the slice of its box the arc crosses, so at 12–16px one end washes
 * out. Drawing `lead` over the leading half of a longer `arc` dash keeps both
 * colours legible at every size, and needs no per-instance gradient id.
 */
function CircleSpinner({
  colors,
  size = "md",
  decorative = false,
  className,
  ...props
}: VariantProps & { colors: SpinnerCircleColors }) {
  const merge = useCn();
  const pixels = typeof size === "number" ? size : undefined;
  const { track = "currentColor", arc = "currentColor", lead = "currentColor" } = colors;
  return (
    <svg
      viewBox="0 0 24 24"
      {...a11yProps(decorative)}
      width={pixels}
      height={pixels}
      className={merge(typeof size === "number" ? undefined : sizeClasses[size], className)}
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

/** The `ring` variant: the `Button` loading ring, a fixed markup with a CSS `animate-spin`. */
function RingSpinner({
  className,
  size: _size,
  decorative: _decorative,
  ...props
}: VariantProps) {
  const merge = useCn();
  return (
    <svg className={merge("h-4 w-4 animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/**
 * The one loading spinner: the loader icon, an app mark with a running dash,
 * the two-tone `circle`, or the `Button` `ring`. See {@link SpinnerProps.variant}.
 */
function Spinner({ variant, mark, colors, stroke, tone = "muted", ...props }: SpinnerProps) {
  const config = useUiConfig("Spinner");
  const merge = useCn();
  if (variant === "ring") return <RingSpinner {...props} />;
  if (variant === "circle") return <CircleSpinner colors={colors ?? config?.circle ?? {}} {...props} />;
  const resolvedMark = variant ? undefined : (mark ?? config?.mark);
  if (resolvedMark) return <MarkSpinner mark={resolvedMark} {...props} />;
  const { size = "md", decorative = false, className, ...iconProps } = props;
  return (
    <IconLoader2
      {...a11yProps(decorative)}
      size={typeof size === "number" ? size : undefined}
      stroke={stroke}
      className={merge(
        "animate-spin",
        tone === "muted" && "text-muted-foreground",
        typeof size === "number" ? undefined : sizeClasses[size],
        className,
      )}
      {...iconProps}
    />
  );
}

export { Spinner };
