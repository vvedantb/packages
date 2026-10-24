/** Matches t3code `TIMELINE_MINIMAP_ITEM_SPACING`: a compact rail, not full height. */
export const JUMP_RAIL_ITEM_SPACING_PX = 8;
/** `dvh`, not `vh`: mobile browser chrome makes `100vh` taller than the visible area. */
export const JUMP_RAIL_MAX_HEIGHT_CSS = "calc(100dvh - 18rem)";
/** Fewest items for which the rail renders. */
export const JUMP_RAIL_MIN_VISIBLE_ITEMS = 2;
/** Tick x offset per heading level below 1, in px. */
export const JUMP_RAIL_LEVEL_INDENT_PX = 2;
/** Narrowest a levelled tick gets, in px. */
export const JUMP_RAIL_MIN_TICK_WIDTH_PX = 4;

/** Rail height: one spacing step per gap, capped at `maxHeight`. */
export function resolveJumpRailHeightStyle(
  itemCount: number,
  maxHeight: string = JUMP_RAIL_MAX_HEIGHT_CSS,
): string {
  const naturalHeight = Math.max(1, (itemCount - 1) * JUMP_RAIL_ITEM_SPACING_PX);
  return `min(${naturalHeight}px, ${maxHeight})`;
}

/** Tick position down the rail, 0 to 100. */
export function resolveJumpRailTopPercent(index: number, itemCount: number): number {
  if (itemCount <= 1) return 0;
  return (Math.max(0, Math.min(index, itemCount - 1)) / (itemCount - 1)) * 100;
}

/** The item under the pointer, or `null` when the rail has no size or no items. */
export function resolveJumpRailIndexFromPointer(input: {
  itemCount: number;
  railTop: number;
  railHeight: number;
  pointerY: number;
}): number | null {
  if (input.itemCount <= 0 || input.railHeight <= 0) return null;
  if (input.itemCount === 1) return 0;
  const progress = Math.max(
    0,
    Math.min(1, (input.pointerY - input.railTop) / input.railHeight),
  );
  return Math.max(
    0,
    Math.min(input.itemCount - 1, Math.round(progress * (input.itemCount - 1))),
  );
}

/** Preview card `translateY`: pinned to the rail ends, centred between. */
export function resolveJumpRailTooltipTranslate(index: number, itemCount: number): string {
  if (index === 0) return "0%";
  if (index === itemCount - 1) return "-100%";
  return "-50%";
}

/** Width in px of a tick at `distance` items from the hovered one (`null`: no hover). */
export function resolveJumpRailTickWidthPx(distance: number | null): number {
  if (distance === 0) return 24;
  if (distance === 1) return 16;
  if (distance === 2) return 10;
  return 8;
}

/** Tailwind width class for a tick at `distance` from the hovered one (`null`: no hover). */
export function resolveJumpRailTickWidthClass(distance: number | null): string {
  if (distance === 0) return "w-6";
  if (distance === 1) return "w-4";
  if (distance === 2) return "w-2.5";
  return "w-2";
}

/**
 * Level-based inline layout for sub-heading ticks. Level 1 (or none) returns
 * `undefined`, so the tick keeps its width class. Deeper levels indent by
 * `JUMP_RAIL_LEVEL_INDENT_PX` per level and shrink by the same amount.
 */
export function resolveJumpRailTickLevelStyle(
  distance: number | null,
  level: number | undefined,
): { left: number; width: number } | undefined {
  if (level === undefined || !Number.isFinite(level) || level <= 1) return undefined;
  const indent = (Math.floor(level) - 1) * JUMP_RAIL_LEVEL_INDENT_PX;
  return {
    left: indent,
    width: Math.max(JUMP_RAIL_MIN_TICK_WIDTH_PX, resolveJumpRailTickWidthPx(distance) - indent),
  };
}
