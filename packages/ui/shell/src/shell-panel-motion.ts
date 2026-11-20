/**
 * Dock motion of the sidebar panel in an `AppShell variant="rail"`, on hide
 * and show only: the panel shrinks into the rail's collapse tile and grows
 * back out of it. `Sidebar.Panel` marks the panel and `RailCollapseTile` the
 * tile (`shellDockTileProps` for a tile of your own). The main content slides
 * its margin with the aside's width, so it does not jump.
 *
 * Off with `MotionProvider reducedMotion` and `PageMotionProvider disabled`
 * (`dockMotionOff`), and outside the rail variant: the toggle runs at once.
 */
import { dockPopIn, dockPopOut, slideWith } from "../../src/motion/dock-motion";

function dockPanel(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-shell-dock-panel]");
}

function dockTile(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-shell-dock-tile]");
}

/** The page beside the shell aside: its left margin follows the aside. */
function slideMainWithAside() {
  const tile = dockTile();
  if (!tile) return;
  const shell = tile.closest<HTMLElement>("[data-shell-variant]");
  slideWith((shell ?? document).querySelector<HTMLElement>("main"), tile.closest<HTMLElement>("aside"), "margin-left");
}

/** Shrink the panel into the collapse tile, then run `hide`. */
export function popOutShellPanel(hide: () => void) {
  dockPopOut(dockPanel(), dockTile(), "left", () => {
    slideMainWithAside();
    hide();
  });
}

/**
 * Call right after the state change that shows the panel. React shows it in
 * this event's commit; the next frame runs before it paints.
 */
export function popInShellPanelNextFrame() {
  if (typeof requestAnimationFrame !== "function") return;
  slideMainWithAside();
  requestAnimationFrame(() => {
    const shown = dockPanel();
    if (shown) dockPopIn(shown, dockTile(), "left");
  });
}

/**
 * Show or hide the sidebar panel with the dock motion. `collapsed` is the
 * state before the toggle; `toggle` flips it. For a hotkey or a context
 * setter that does not go through `RailCollapseTile`.
 */
export function toggleShellPanel(collapsed: boolean, toggle: () => void) {
  if (collapsed) {
    toggle();
    popInShellPanelNextFrame();
  } else {
    popOutShellPanel(toggle);
  }
}
