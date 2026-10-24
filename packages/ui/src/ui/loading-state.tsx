import { useRef, useSyncExternalStore, type CSSProperties } from "react";

import { cn } from "../utils/cn";
import { bindRuntimeAnimation } from "../utils/runtimeVisibility";
import { quantizedSnapshot, subscribeQuantized } from "../utils/sharedClock";
import { useUiConfig } from "./ui-config";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle is shorter than the sweep, so
 *            two fronts are always in flight
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *
 * Cells pulse on WAAPI, not a CSS `animation`: a CSS one
 * fires `animationiteration` every cycle, and React's
 * eagerly-attached root listeners turn each into a main-
 * thread style recalc (~14×/s per mounted loader). WAAPI
 * emits no animation events and runs the same keyframes.
 *
 * Paired with a label and a live elapsed timer in mono
 * tabular figures.
 *
 * Source: https://21st.dev/@theshanelevine/components/loading-state
 * ───────────────────────────────────────────────────────── */

export type LoadingStateVariant = "Drive" | "Dots" | "Orbit";
/** `default` = 4px cells (~15px grid). `sm` = 3px cells (~11px grid). */
export type LoadingStateSize = "default" | "sm";

/** Cell colours for the grid's left, middle and right column. */
export type LoadingStateColors = readonly [string, string, string];

export interface LoadingStateConfig {
  /** Default for the `label` prop. */
  label?: string;
  /** Default for the `colors` prop. */
  colors?: LoadingStateColors;
  /** Default for the `labelStyle` prop. */
  labelStyle?: CSSProperties;
  /** Replaces the built-in classes of a part. */
  classes?: {
    /** The label text. Default `text-sm font-medium text-muted-foreground`. */
    label?: string;
  };
}

const SIZE_TOKENS: Record<
  LoadingStateSize,
  { cellPx: number; gapPx: number; radiusClass: string }
> = {
  // 3×3px + 2×1px gaps = 11px.
  sm: { cellPx: 3, gapPx: 1, radiusClass: "rounded-[0.5px]" },
  default: { cellPx: 4, gapPx: 1.5, radiusClass: "rounded-[1px]" },
};

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<
  LoadingStateVariant,
  { delays: (number | null)[]; dur: number; round: boolean }
> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

const DEFAULT_COLORS: LoadingStateColors = ["currentColor", "currentColor", "currentColor"];

const defaultLabelClass = "text-sm font-medium text-muted-foreground";

/** Started on attach, cancelled on detach. `undefined` for a gap cell. */
type PulseRef = ((cell: HTMLSpanElement) => () => void) | undefined;

/**
 * One ref callback per cell. The easing sits on the keyframes, not in the
 * options, because CSS applies `animation-timing-function` per segment —
 * as an option it would ease the whole cycle instead. No `fill`, so during
 * its delay a cell keeps the static inline opacity, as under CSS.
 */
function pulseRefs(delays: (number | null)[], dur: number): PulseRef[] {
  return delays.map((d) =>
    d === null
      ? undefined
      : (cell: HTMLSpanElement) => {
          const pulse = cell.animate(
            [
              { opacity: 0.12, easing: "ease-in-out" },
              { opacity: 1, easing: "ease-in-out" },
              { opacity: 0.12 },
            ],
            { duration: dur, delay: d, iterations: Infinity },
          );
          return bindRuntimeAnimation(cell, pulse);
        },
  );
}

/**
 * Built once per variant, because these identities have to be stable: a ref
 * callback built during render would be a new function every render, and React
 * detaches and reattaches on identity change — restarting the pulse each time
 * (the labelled variant re-renders 10×/s off `useElapsed`).
 */
const PULSE_REFS: Record<LoadingStateVariant, PulseRef[]> = {
  Drive: pulseRefs(PATTERNS.Drive.delays, PATTERNS.Drive.dur),
  Dots: pulseRefs(PATTERNS.Dots.delays, PATTERNS.Dots.dur),
  Orbit: pulseRefs(PATTERNS.Orbit.delays, PATTERNS.Orbit.dur),
};

const ELAPSED_MS = 100;
const noopSubscribe = () => () => {};

function useElapsed(enabled: boolean) {
  const startedAt = useRef(Date.now());
  const tick = useSyncExternalStore(
    enabled
      ? (onChange) => subscribeQuantized(ELAPSED_MS, onChange)
      : noopSubscribe,
    () => quantizedSnapshot(ELAPSED_MS),
    () => quantizedSnapshot(ELAPSED_MS),
  );
  const total = enabled ? Math.max(0, (tick - startedAt.current) / 1000) : 0;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export interface LoadingStateProps {
  /** Label text, also the `aria-label` when `iconOnly`. Default `UiConfig.LoadingState.label`, else `"Working"`. */
  label?: string;
  variant?: LoadingStateVariant;
  size?: LoadingStateSize;
  /** Pixel grid only — no label or elapsed timer. */
  iconOnly?: boolean;
  /** Column colours. Default `UiConfig.LoadingState.colors`, else `currentColor`. */
  colors?: LoadingStateColors;
  /** Inline style for the label, e.g. a shimmer gradient. Default `UiConfig.LoadingState.labelStyle`. */
  labelStyle?: CSSProperties;
}

export function LoadingState({
  label: labelProp,
  variant = "Drive",
  size = "default",
  iconOnly = false,
  colors: colorsProp,
  labelStyle: labelStyleProp,
}: LoadingStateProps) {
  const config = useUiConfig("LoadingState");
  const label = labelProp ?? config?.label ?? "Working";
  const colors = colorsProp ?? config?.colors ?? DEFAULT_COLORS;
  const labelStyle = labelStyleProp ?? config?.labelStyle;
  const elapsed = useElapsed(!iconOnly);
  const { delays, round } = PATTERNS[variant];
  const { cellPx, gapPx, radiusClass } = SIZE_TOKENS[size];

  const grid = (
    <span
      aria-hidden
      data-anim-chrome=""
      className="grid grid-cols-3"
      style={{
        gap: gapPx,
        gridTemplateColumns: `repeat(3, ${cellPx}px)`,
      }}
    >
      {delays.map((d, i) => (
        <span
          key={i}
          ref={PULSE_REFS[variant][i]}
          className={round ? "rounded-full" : radiusClass}
          style={{
            width: cellPx,
            height: cellPx,
            backgroundColor: colors[i % 3],
            opacity: d === null ? 0.07 : 0.15,
          }}
        />
      ))}
    </span>
  );

  if (iconOnly) {
    return (
      <div className="flex w-fit items-center" role="status" aria-label={label}>
        {grid}
      </div>
    );
  }

  return (
    <div className="flex w-fit items-center gap-2.5">
      {grid}
      <span className={cn(config?.classes?.label ?? defaultLabelClass)} style={labelStyle}>
        {label}
      </span>
      <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
        {elapsed}
      </span>
    </div>
  );
}
