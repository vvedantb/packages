import type { ReactNode } from "react";
import { cn } from "../cn.js";
import { SettingsStack } from "./SettingsStack.js";

export type SettingsLayoutProps = {
  title: string;
  headerRight?: ReactNode;
  toolbar?: ReactNode;
  tabs?: ReactNode;
  fillHeight?: boolean;
  children: ReactNode;
};

export interface SettingsPageProps {
  title: string;
  /** Sparse primary action(s) in the title row (e.g. Add, Delete). */
  headerRight?: ReactNode;
  /** Filters / search / segmented controls. Sits under the title. */
  toolbar?: ReactNode;
  /** Route tabs. Sit under the title (and under toolbar if both exist). */
  tabs?: ReactNode;
  /**
   * Wrap children in the standard settings section stack. Set false when the
   * child already owns its own vertical rhythm.
   */
  stack?: boolean;
  /** Fill the remaining shell height instead of scrolling the page. */
  fillHeight?: boolean;
  /**
   * Page chrome supplied by the app (for example its own page container).
   * Receives the stacked children. Defaults to a plain `div` layout.
   */
  layout?: (props: SettingsLayoutProps) => ReactNode;
  children: ReactNode;
}

/** Plain fallback layout: heading, optional slots, then the body. */
export function DefaultSettingsLayout({
  title,
  headerRight,
  toolbar,
  tabs,
  fillHeight = false,
  children,
}: SettingsLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6",
        fillHeight && "h-full min-h-0",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-balance text-lg font-semibold text-foreground">
          {title}
        </h1>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      {toolbar ? <div>{toolbar}</div> : null}
      {tabs ? <div>{tabs}</div> : null}
      <div className={cn(fillHeight ? "min-h-0 flex-1" : null)}>{children}</div>
    </div>
  );
}

/**
 * Shared chrome for settings: title row, optional toolbar / tabs, then a
 * consistent section stack. Apps pass `layout` to wrap their own page
 * container; this package does not import one.
 */
export function SettingsPage({
  title,
  headerRight,
  toolbar,
  tabs,
  stack = true,
  fillHeight = false,
  layout,
  children,
}: SettingsPageProps) {
  const body = stack ? <SettingsStack>{children}</SettingsStack> : children;
  const render = layout ?? DefaultSettingsLayout;
  return (
    <>
      {render({ title, headerRight, toolbar, tabs, fillHeight, children: body })}
    </>
  );
}
