import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import {
  DRIVE_DELAYS,
  DRIVE_SIZES,
  DRIVE_STILL_FRAME_MS,
  driveCellOpacity,
  type LoadingStateSize,
} from "./loadingGrid";
import { tokens } from "./tokens";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";

export type { LoadingStateSize } from "./loadingGrid";

export type LoadingStateProps = {
  /** What is running, for assistive tech. Default `"Working"`, as the web. */
  label?: string;
  /** `sm` is the web session-row grid (3 pt cells, 11 pt). Default `"default"` (4 pt cells, 15 pt). */
  size?: LoadingStateSize;
  /** Cell colour. Default the muted text colour. Native has no `currentColor`. */
  color?: string;
  /**
   * One colour per column, left to right, as the web `LoadingState` `colors`
   * (Eva's brand purple-to-blue sweep). Wins over `color`.
   */
  colors?: readonly [string, string, string];
  /** Hold a still frame, for example while the screen is not focused. Default `false`. */
  paused?: boolean;
};

/**
 * The web `LoadingState` with `variant="Drive"` and `iconOnly`: a 3x3 pixel
 * grid whose chevron wavefront drives right. Same cells, delays, 650 ms
 * cycle and keyframes as the web (see `loadingGrid.ts`). One frame clock per
 * grid on the UI thread, started on mount as the web WAAPI pulse is. With
 * Reduce Motion, or `paused`, it holds a still chevron frame and runs no
 * clock. The labelled form (label and elapsed timer) and the `Dots` and
 * `Orbit` variants are not ported.
 */
export function LoadingState({ label = "Working", size = "default", color, colors, paused = false }: LoadingStateProps) {
  const scheme = useScheme();
  const reduceMotion = useReduceMotion();
  const single = color ?? tokens.color.muted[scheme];
  const fill: Fills = colors ?? [single, single, single];
  const still = reduceMotion || paused;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ alignSelf: "flex-start" }}
    >
      {still ? (
        <DriveGrid size={size} fill={fill} elapsed={undefined} />
      ) : (
        <RunningDriveGrid size={size} fill={fill} />
      )}
    </View>
  );
}

/** Column colours, left to right. */
type Fills = readonly [string, string, string];

/** Owns the clock, so unmounting it (Reduce Motion, `paused`) stops the frame callback. */
function RunningDriveGrid({ size, fill }: { size: LoadingStateSize; fill: Fills }) {
  const elapsed = useSharedValue(0);
  useFrameCallback((frame) => {
    "worklet";
    elapsed.set(frame.timeSinceFirstFrame);
  }, true);
  return <DriveGrid size={size} fill={fill} elapsed={elapsed} />;
}

/** The nine cells. No `elapsed`: the still frame. */
function DriveGrid({
  size,
  fill,
  elapsed,
}: {
  size: LoadingStateSize;
  fill: Fills;
  elapsed: SharedValue<number> | undefined;
}) {
  const { gap } = DRIVE_SIZES[size];
  // Three explicit rows, not a wrapping row: a fractional gap could wrap early.
  return (
    <View style={{ gap }}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flexDirection: "row", gap }}>
          {DRIVE_DELAYS.slice(row * 3, row * 3 + 3).map((delay, column) =>
            elapsed ? (
              <DriveCell key={column} size={size} fill={fill[column] ?? fill[0]} delay={delay} elapsed={elapsed} />
            ) : (
              <View
                key={column}
                style={[cellStyle(size, fill[column] ?? fill[0]), { opacity: driveCellOpacity(DRIVE_STILL_FRAME_MS, delay) }]}
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function DriveCell({
  size,
  fill,
  delay,
  elapsed,
}: {
  size: LoadingStateSize;
  fill: string;
  delay: number;
  elapsed: SharedValue<number>;
}) {
  const pulse = useAnimatedStyle(() => ({ opacity: driveCellOpacity(elapsed.get(), delay) }));
  return <Animated.View style={[cellStyle(size, fill), pulse]} />;
}

function cellStyle(size: LoadingStateSize, fill: string) {
  const { cell, radius } = DRIVE_SIZES[size];
  return { width: cell, height: cell, borderRadius: radius, backgroundColor: fill };
}
