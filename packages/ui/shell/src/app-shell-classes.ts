import { cn } from "../../src/utils/cn";

// Class strings for the app shell, copied from existing app markup so an app
// that moves to these components renders the same classes. The bare muted and
// accent colour names match that markup and are allow-listed for check:tokens
// on the marked lines only.

/** Rail tile: size-11, rounded-lg, press scale. */
export const railTileClass =
  "relative flex size-11 items-center justify-center rounded-lg border active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

const railTileActiveClass = "border-transparent bg-surface-tertiary text-foreground";
const railTileIdleClass = "border-transparent text-muted opacity-75 hover:bg-surface-tertiary/50 hover:opacity-100 hover:text-foreground"; // check-tokens-allow: text-muted

export function railTileStateClass(active: boolean): string {
  return active ? railTileActiveClass : railTileIdleClass;
}

/** Count badge pinned to the bottom-right of a rail tile. */
export const railBadgeClass = "absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground"; // check-tokens-allow: accent

/** Static section label, sentence case, padded to match nav rows. */
export const sidebarSectionLabelClass =
  "sidebar-section-label px-3 py-1 text-[11px] font-medium tracking-[-0.01em]";

/** Nav link text: muted until active. */
export function sidebarNavLinkTextClass(isActive: boolean): string {
  return cn(isActive ? "text-foreground" : "text-muted hover:text-foreground"); // check-tokens-allow: text-muted
}

/** Padding for main sidebar nav rows. */
export function sidebarNavRowClass(isIconOnly: boolean): string {
  return cn(isIconOnly ? "justify-center px-0 py-1.5" : "gap-3 px-3 py-1.5");
}

export const mobileMenuButtonClass = "-ml-1 h-11 w-11 shrink-0 rounded-lg text-muted hover:bg-surface-tertiary/50 hover:text-foreground"; // check-tokens-allow: text-muted

export const panelCloseButtonClass = "rounded-lg text-muted hover:bg-surface-tertiary/50 hover:text-foreground"; // check-tokens-allow: text-muted

export const accountEmailClass = "block truncate text-xs font-normal text-muted"; // check-tokens-allow: text-muted

export const signOutDescriptionClass = "mt-1 text-sm text-muted"; // check-tokens-allow: text-muted

export const signOutCancelClass = "text-muted"; // check-tokens-allow: text-muted
