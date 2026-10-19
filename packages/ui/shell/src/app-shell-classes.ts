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

/**
 * Static section label above a group of panel nav rows. `px-4` lines the text
 * up with the nav row icons; the colour comes from the app's
 * `.sidebar-section-label` rule.
 */
export const sidebarSectionLabelClass =
  "sidebar-section-label px-4 py-1 text-[11px] leading-4 font-medium tracking-[-0.01em]";

/**
 * Nav row state: idle rows are `foreground/80` and get the fill on hover;
 * the active row is `font-medium text-foreground` on a static fill.
 */
export function sidebarNavLinkTextClass(isActive: boolean): string {
  return isActive
    ? "bg-surface-tertiary font-medium text-foreground"
    : "font-normal text-foreground/80 hover:bg-surface-tertiary hover:text-foreground";
}

/**
 * Panel nav row layout: full width, `rounded-menu-item` (8px), 13px / 18px
 * text, focus ring and press scale. Icon-only rows centre the icon.
 */
export function sidebarNavRowClass(isIconOnly: boolean): string {
  return cn(
    "group flex w-full items-center rounded-menu-item py-1.5 text-[0.8125rem] leading-[18px] tracking-[0.005em] transition-[scale,background-color,color] duration-150 ease-smooth active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35",
    isIconOnly ? "justify-center px-0" : "gap-2 px-4",
  );
}

export type SidebarNavItemClassOptions = {
  /** Current route. */
  active?: boolean;
  /** Collapsed panel: centred icon, no horizontal padding. */
  iconOnly?: boolean;
};

/** Whole panel nav row: `sidebarNavRowClass` plus `sidebarNavLinkTextClass`. */
export function sidebarNavItemClass({ active = false, iconOnly = false }: SidebarNavItemClassOptions = {}): string {
  return cn(sidebarNavRowClass(iconOnly), sidebarNavLinkTextClass(active));
}

/** Nav row icon (put it on the `<svg>`): 19px, muted until active. */
export function sidebarNavIconClass(active: boolean): string {
  return cn("size-[19px] shrink-0", active ? "text-foreground" : "text-muted-foreground");
}

/** Sidebar header row: the panel title and its trailing actions. */
export const sidebarHeaderRowClass = "flex h-11 items-center gap-1 pl-3 pr-1";

export const mobileMenuButtonClass = "-ml-1 h-11 w-11 shrink-0 rounded-lg text-muted hover:bg-surface-tertiary/50 hover:text-foreground"; // check-tokens-allow: text-muted

export const panelCloseButtonClass = "rounded-lg text-muted hover:bg-surface-tertiary/50 hover:text-foreground"; // check-tokens-allow: text-muted

export const accountEmailClass = "block truncate text-xs font-normal text-muted"; // check-tokens-allow: text-muted

export const signOutDescriptionClass = "mt-1 text-sm text-muted"; // check-tokens-allow: text-muted

export const signOutCancelClass = "text-muted"; // check-tokens-allow: text-muted

/** Label of the type-to-confirm field (`ConfirmDialog.Field`). */
export const confirmFieldLabelClass = "text-sm text-muted"; // check-tokens-allow: text-muted
