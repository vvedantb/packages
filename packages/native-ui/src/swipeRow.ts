import type { IconProps } from "@tabler/icons-react-native";
import type { ComponentType } from "react";

/**
 * The rules of a swipeable list row (`SwipeableRow`), as plain numbers, so
 * they stay testable apart from the gesture. The offset is in points:
 * positive when the row moves right (it reveals the leading actions),
 * negative when it moves left (the trailing actions). Velocities are in
 * points per second, the Gesture Handler unit. Each rule is a worklet, so the
 * drag runs it on the UI thread.
 */

/** One action a swipe reveals behind a row. */
export type SwipeAction = {
  /** Unique in the row; also the accessibility action name. */
  key: string;
  /** What the action does ("Archive"): the accessibility label of its button and of its row action. */
  label: string;
  /** A Tabler icon, drawn in the tone's foreground. */
  icon: ComponentType<IconProps>;
  /** The fill: `default` the primary fill, `warning` (such as Archive), `danger` for a destructive action. */
  tone?: "default" | "warning" | "danger";
  /**
   * Runs the action. With `exits`, a returned promise that settles while
   * the row is still on screen (it failed, or the row stays) brings the row
   * back.
   */
  onPress: () => void | Promise<unknown>;
  /** The action takes the row out of the list (Archive): a full swipe slides it out. Else the row springs back. */
  exits?: boolean;
};

export type SwipeSide = "leading" | "trailing";

/** The revealed widths of each side (0 for a side with no actions) and the row's width. */
export type SwipeSides = { leading: number; trailing: number; width: number };

/** The width of one revealed action button. */
export const SWIPE_ACTION_WIDTH = 72;

/** Sideways travel (pt) before the drag takes the row: a tap, or a scroll, never moves it. */
export const SWIPE_ACTIVE_OFFSET_X = 12;

/** Vertical travel (pt) that hands the touch to the list's scroll first: a small diagonal drag scrolls. */
export const SWIPE_FAIL_OFFSET_Y = 8;

/**
 * The pan's sideways thresholds. A row takes a sideways drag past
 * `SWIPE_ACTIVE_OFFSET_X` either way. Inside a `Pager` it takes only the
 * directions it has actions for, and a drag the other way fails it at once,
 * so the pager behind moves instead (a Sessions row swiped right).
 */
export function swipeRowActivation(
  sides: Pick<SwipeSides, "leading" | "trailing">,
  insidePager: boolean,
): { activeOffsetX: number | [number, number]; failOffsetX?: number } {
  if (!insidePager || (sides.leading > 0 && sides.trailing > 0)) {
    return { activeOffsetX: [-SWIPE_ACTIVE_OFFSET_X, SWIPE_ACTIVE_OFFSET_X] };
  }
  // Left (negative) reveals the trailing actions; right the leading ones.
  return sides.trailing > 0
    ? { activeOffsetX: -SWIPE_ACTIVE_OFFSET_X, failOffsetX: SWIPE_ACTIVE_OFFSET_X }
    : { activeOffsetX: SWIPE_ACTIVE_OFFSET_X, failOffsetX: -SWIPE_ACTIVE_OFFSET_X };
}

/** How far ahead (s) the release velocity carries the row when deciding where it settles. */
const PROJECTION_S = 0.2;

/** How far a row moves past its reach: less and less the further the finger goes. */
function rubberband(overshoot: number): number {
  "worklet";
  const constant = 0.55;
  return (overshoot * SWIPE_ACTION_WIDTH * constant) / (SWIPE_ACTION_WIDTH + constant * overshoot);
}

/**
 * Where the row sits for a finger `raw` points from where the drag caught
 * it. Toward a side with actions it follows 1:1, out to its own width; toward
 * a side with none, and past its width, it meets growing resistance.
 */
export function swipeRowOffset(raw: number, sides: SwipeSides): number {
  "worklet";
  const reveal = raw >= 0 ? sides.leading : sides.trailing;
  const reach = reveal > 0 ? sides.width : 0;
  const distance = Math.abs(raw);
  if (distance <= reach) return raw;
  return Math.sign(raw) * (reach + rubberband(distance - reach));
}

/** How far the row must travel for a full swipe to commit the first action: half the row, and always past the revealed buttons. */
export function swipeFullAt(reveal: number, width: number): number {
  "worklet";
  return Math.max(reveal + SWIPE_ACTION_WIDTH, width / 2);
}

/** The side whose first action a release here would commit (the full swipe is armed), or `null`. */
export function swipeRowArmed(x: number, sides: SwipeSides): SwipeSide | null {
  "worklet";
  const side: SwipeSide = x >= 0 ? "leading" : "trailing";
  const reveal = sides[side];
  if (reveal === 0 || Math.abs(x) < swipeFullAt(reveal, sides.width)) return null;
  return side;
}

export type SwipeSettle = { kind: "close" } | { kind: "open"; side: SwipeSide } | { kind: "commit"; side: SwipeSide };

/**
 * Where a released row goes, from where it is (`x`) carried on by its speed
 * (`vx`): past the full-swipe point, with its buttons already in view, it
 * commits the first action; past half its buttons it opens; else it closes.
 * A flick the other way closes it however far it was.
 */
export function swipeRowSettle(x: number, vx: number, sides: SwipeSides): SwipeSettle {
  "worklet";
  if (x === 0) return { kind: "close" };
  const side: SwipeSide = x > 0 ? "leading" : "trailing";
  const reveal = sides[side];
  if (reveal === 0) return { kind: "close" };
  // The projected travel toward this side: negative after a flick back past rest.
  const reach = Math.sign(x) * (x + vx * PROJECTION_S);
  if (Math.abs(x) > reveal && reach >= swipeFullAt(reveal, sides.width)) return { kind: "commit", side };
  if (reach > reveal / 2) return { kind: "open", side };
  return { kind: "close" };
}

/** A row that can be closed from outside: the open row closes when another opens, a list scrolls or a row is tapped. */
export type SwipeRowHandle = { close: () => void };

let openRow: SwipeRowHandle | null = null;

/** Marks `row` as the open row, closing the one open before: one row is open at a time. */
export function markSwipeRowOpen(row: SwipeRowHandle) {
  if (openRow && openRow !== row) openRow.close();
  openRow = row;
}

/** Forgets `row` once it has closed itself. */
export function markSwipeRowClosed(row: SwipeRowHandle) {
  if (openRow === row) openRow = null;
}

/** Whether a row is open. A touch on any row then only closes it. */
export function isSwipeRowOpen(): boolean {
  return openRow !== null;
}

/** Closes the open row, if any. Pass it to a list's `onScrollBeginDrag`, so a scroll closes the row. */
export function closeSwipeRows() {
  const row = openRow;
  openRow = null;
  row?.close();
}

/**
 * The row's actions for VoiceOver and TalkBack, which cannot swipe a row:
 * spread on the row's main pressable, so the actions rotor (iOS) or the
 * actions menu (Android) offers each one, with its label.
 */
export function swipeActionsAccessibility(actions: readonly SwipeAction[]): {
  accessibilityActions: { name: string; label: string }[];
  onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => void;
} {
  return {
    accessibilityActions: actions.map((action) => ({ name: action.key, label: action.label })),
    onAccessibilityAction: (event) => {
      void actions.find((action) => action.key === event.nativeEvent.actionName)?.onPress();
    },
  };
}
