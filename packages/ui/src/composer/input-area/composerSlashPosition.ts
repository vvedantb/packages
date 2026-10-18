export interface ComposerSlashPlacement {
  top: number;
  left: number;
  width: number;
  placement: "above" | "below";
  maxHeight: number;
}

const POPUP_GAP = 6;
const VIEWPORT_PADDING = 8;
const PANEL_MAX_HEIGHT = 340;
const PANEL_MIN_ABOVE = 200;

export function computePanelPopupPlacement(
  anchor: DOMRect,
  viewport: { width: number; height: number },
): ComposerSlashPlacement {
  const spaceAbove = anchor.top - VIEWPORT_PADDING - POPUP_GAP;
  const spaceBelow =
    viewport.height - anchor.bottom - VIEWPORT_PADDING - POPUP_GAP;
  const placeAbove = spaceAbove >= PANEL_MIN_ABOVE || spaceAbove >= spaceBelow;
  const placement = placeAbove ? "above" : "below";
  const available = placeAbove ? spaceAbove : spaceBelow;

  return {
    top: placeAbove ? anchor.top - POPUP_GAP : anchor.bottom + POPUP_GAP,
    left: anchor.left,
    width: anchor.width,
    placement,
    maxHeight: Math.max(160, Math.min(PANEL_MAX_HEIGHT, available)),
  };
}

export function viewportSize(): { width: number; height: number } {
  const visual = window.visualViewport;
  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
  };
}
