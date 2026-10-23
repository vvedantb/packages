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
 * up with the nav row icons; the colour comes from `.sidebar-section-label` in
 * tokens.css.
 */
export const sidebarSectionLabelClass =
  "sidebar-section-label px-4 py-1 text-[11px] leading-4 font-medium tracking-[-0.01em]";

/**
 * Nav row state: idle rows are `foreground/80` and get the `sidebar-accent`
 * fill on hover; the active row is `font-medium text-foreground` on a static
 * fill.
 */
export function sidebarNavLinkTextClass(isActive: boolean): string {
  return isActive
    ? "bg-sidebar-accent font-medium text-foreground"
    : "font-normal text-foreground/80 hover:bg-sidebar-accent hover:text-foreground";
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
  /** Picked (for example in a multi-select list): the active fill, without `font-medium`. Same as `data-selected="true"`. */
  selected?: boolean;
  /** Row being dragged: `opacity-40 cursor-grabbing`. Same as `data-dragging="true"`. */
  dragging?: boolean;
  /** Row under a drag: fill plus an inset `ring-focus` ring. Same as `data-drop-target="true"`. */
  dropTarget?: boolean;
};

// Row states an app can also set as data attributes on the row itself.
const sidebarNavItemDataStateClass =
  "data-[selected=true]:bg-sidebar-accent data-[selected=true]:text-foreground data-[dragging=true]:cursor-grabbing data-[dragging=true]:opacity-40 data-[drop-target=true]:bg-sidebar-accent data-[drop-target=true]:text-foreground data-[drop-target=true]:ring-2 data-[drop-target=true]:ring-inset data-[drop-target=true]:ring-focus";

/**
 * Whole panel nav row: `sidebarNavRowClass` plus `sidebarNavLinkTextClass`,
 * plus `data-selected`, `data-dragging` and `data-drop-target` (`="true"`)
 * styles. The `selected`, `dragging` and `dropTarget` options apply the same
 * styles without the attributes.
 */
export function sidebarNavItemClass({
  active = false,
  iconOnly = false,
  selected = false,
  dragging = false,
  dropTarget = false,
}: SidebarNavItemClassOptions = {}): string {
  return cn(
    sidebarNavRowClass(iconOnly),
    sidebarNavLinkTextClass(active),
    sidebarNavItemDataStateClass,
    selected && "bg-sidebar-accent text-foreground",
    dragging && "cursor-grabbing opacity-40",
    dropTarget && "bg-sidebar-accent text-foreground ring-2 ring-inset ring-focus",
  );
}

/**
 * Nested row padding: each `indent` level adds 12px to the row's 16px
 * (`px-4`) left padding. Put it on the row's `style`.
 */
export function sidebarNavItemIndentStyle(indent: number): { paddingLeft: string } {
  return { paddingLeft: `calc(1rem + ${indent * 12}px)` };
}

/** Row part: leading checkbox, icon, avatar or status dot. */
export const sidebarNavItemLeadingClass = "flex shrink-0 items-center";

/**
 * Row part: the label, which takes the free width and truncates. For two
 * lines, put `block truncate` spans inside (subtitle: `sidebarNavItemSubtitleClass`).
 */
export const sidebarNavItemLabelClass = "min-w-0 flex-1 truncate";

/** Second, muted line inside the label. */
export const sidebarNavItemSubtitleClass = "block truncate text-xs text-muted-foreground";

/** Row part: always-visible trailing content (counts, badges, spinners). */
export const sidebarNavItemTrailingClass = "ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground";

/**
 * Row part: actions such as a `...` menu button. In the row flow at the end,
 * 24px tall without growing the row. Hidden until the row is hovered or has
 * focus, or a menu trigger inside it (or the part itself) is
 * `data-state="open"`.
 */
export const sidebarNavItemActionsClass =
  "-my-1 ml-auto flex h-6 shrink-0 items-center opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-state=open]]:opacity-100 data-[state=open]:opacity-100";

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
