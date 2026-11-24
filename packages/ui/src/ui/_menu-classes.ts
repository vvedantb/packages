// floating overlay: tone + smooth-shadow-ring, never border+shadow
const floatingSurfaceToneClass =
  "bg-overlay text-overlay-foreground smooth-shadow-ring-lg max-sm:max-w-[calc(100vw-2rem)]";

export const floatingSurfaceClass = `rounded-lg ${floatingSurfaceToneClass}`;

// Menu surface: the corner is the item radius plus the `p-1` inset, so a
// highlighted item keeps the same gap to the edge round the corner.
export const menuSurfaceClass = `rounded-menu ${floatingSurfaceToneClass}`;

export const floatingSurfaceAnimateClass = [
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[var(--radix-popper-transform-origin)]",
].join(" ");

/**
 * Menus and popovers grow out of what opened them and shrink back into it, as
 * Dialog does (`modalTransition`): 40% scale at the Radix transform origin,
 * which is the trigger (or the cursor for a context menu). Open 150 ms, close
 * 100 ms: a slower close makes a menu linger after a selection. The arbitrary
 * `zoom-*-[0.4]` works with both `tailwindcss-animate` and `tw-animate-css`.
 * Hover cards and selects keep `floatingSurfaceAnimateClass`.
 */
export const triggerZoomAnimateClass =
  "origin-[var(--radix-popper-transform-origin)] duration-150 data-[state=closed]:duration-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.4] data-[state=closed]:zoom-out-[0.4]";

// shared floating menu surfaces: popover tone + smooth-shadow-ring-lg
export const menuContentClass = [
  "z-50 min-w-[12rem] overflow-hidden p-1 outline-none max-sm:max-h-[85dvh] max-sm:overflow-y-auto",
  menuSurfaceClass,
  triggerZoomAnimateClass,
].join(" ");

export const menuSubTriggerClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-menu-item px-2.5 py-1.5 max-sm:min-h-10 text-sm text-foreground outline-none transition-[background-color,color] focus:bg-default focus:text-foreground data-[highlighted]:bg-default data-[highlighted]:text-foreground data-[state=open]:bg-default data-[disabled]:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

export const menuItemClass =
  "relative flex cursor-pointer select-none items-center gap-2 rounded-menu-item px-2.5 py-1.5 max-sm:min-h-10 text-sm outline-none transition-[background-color,color] focus:bg-default focus:text-foreground data-[highlighted]:bg-default data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 [&_svg]:pointer-events-none";

export const menuCheckboxRadioItemClass =
  "relative flex cursor-pointer select-none items-center rounded-menu-item py-1.5 max-sm:min-h-10 pl-8 pr-2.5 text-sm outline-none transition-[background-color,color] focus:bg-default focus:text-foreground data-[highlighted]:bg-default data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50";

export const menuLabelClass =
  "px-2.5 py-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground";

export const menuSeparatorClass = "-mx-1 my-1 h-px bg-separator";

export const menuShortcutClass = "ml-auto text-xs tracking-wide text-muted-foreground/90";
