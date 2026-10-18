import { ViewTransition, type ReactNode } from "react";

export interface PanelTransitionProps {
  children?: ReactNode;
  /** View transition class on enter. */
  enter?: string;
  /** View transition class on exit. */
  exit?: string;
}

/**
 * Enter and exit view transition for a panel; updates inside it do not animate.
 * Needs a React build that exports `ViewTransition`. The app supplies the
 * `::view-transition-*` CSS for the class names (`vt-panel-in` and
 * `vt-panel-out` by default).
 */
export function PanelTransition({
  children,
  enter = "vt-panel-in",
  exit = "vt-panel-out",
}: PanelTransitionProps) {
  return (
    <ViewTransition default="none" enter={enter} exit={exit}>
      {children}
    </ViewTransition>
  );
}
