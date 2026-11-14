import type { ReactNode } from "react";
import { floatingSurfaceClass } from "../ui/_menu-classes";
import { cn } from "../utils/cn";

export type FloatingBarProps = {
  /** The bar's content, laid out in one row. */
  children: ReactNode;
  /** Classes for the fixed `<header>` wrapper, for example an entrance animation. */
  className?: string;
  /** Classes for the pill itself, for example another `max-w-*`. */
  barClassName?: string;
};

/**
 * The floating pill that marketing headers sit in: a fixed, transparent `<header>` with a rounded bar on the shared
 * floating surface. A spacer of the same height holds its place in the page, so the page needs no top padding. It is
 * fixed, not sticky, because `sticky` stops working inside a wrapper that sets `overflow-x-hidden`. Only the pill
 * takes pointer events; the gap around it lets clicks through. `SiteHeader` is built on it. Use it directly when the
 * header needs its own navigation, such as a menu with panels.
 */
export function FloatingBar({ children, className, barClassName }: FloatingBarProps) {
  return (
    <>
      <div aria-hidden="true" data-floating-bar-spacer="" className="h-[4.25rem] sm:h-[4.5rem]" />
      <header className={cn("pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:pt-4", className)}>
        <div
          data-floating-bar=""
          className={cn(
            floatingSurfaceClass,
            "pointer-events-auto relative mx-auto flex h-14 w-full max-w-4xl items-center rounded-full px-2",
            barClassName,
          )}
        >
          {children}
        </div>
      </header>
    </>
  );
}
