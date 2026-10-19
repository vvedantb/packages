/** Floating overlay shell: tone + smooth-shadow-ring, no hairline. */
export const floatingSurfaceClass =
  "rounded-lg bg-overlay text-overlay-foreground smooth-shadow-ring-lg";

export const floatingTooltipSurfaceClass =
  "rounded-lg bg-overlay text-overlay-foreground smooth-shadow-ring-md";

export const floatingSurfaceAnimateClass = [
  "origin-(--radix-popper-transform-origin) data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:duration-200 data-[state=closed]:duration-150 data-[state=open]:ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:ease-[cubic-bezier(0.32,0.72,0,1)]",
].join(" ");

/** Shared floating menu surfaces: popover tone + smooth-shadow-ring-lg. */
export const menuContentClass = [
  "z-50 min-w-48 overflow-hidden p-1.5 outline-hidden",
  floatingSurfaceClass,
  floatingSurfaceAnimateClass,
].join(" ");

export const menuSubTriggerClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-menu-item px-2.5 py-2 text-sm text-foreground outline-hidden transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.99] focus:bg-default focus:text-foreground data-highlighted:bg-default data-highlighted:text-foreground data-[state=open]:bg-default data-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

export const menuItemClass =
  "relative flex cursor-pointer select-none items-center gap-2 rounded-menu-item px-2.5 py-2 text-sm outline-hidden transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.99] focus:bg-default focus:text-foreground data-highlighted:bg-default data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 [&_svg]:pointer-events-none";

export const menuCheckboxRadioItemClass =
  "relative flex cursor-pointer select-none items-center rounded-menu-item py-2 pl-8 pr-2.5 text-sm outline-hidden transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.99] focus:bg-default focus:text-foreground data-highlighted:bg-default data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50";

export const menuLabelClass =
  "px-2.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground";

export const menuSeparatorClass = "-mx-1.5 my-1 h-px bg-separator";

export const menuShortcutClass = "ml-auto text-xs tracking-wide text-muted-foreground/90";
