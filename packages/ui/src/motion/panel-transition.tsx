import * as React from "react";
import type { ComponentType, ReactNode } from "react";

/** The `ViewTransition` props used here. Typed locally so consumers on `@types/react` without `ViewTransition` still typecheck. */
type ViewTransitionLikeProps = {
  children?: ReactNode;
  default?: string;
  enter?: string;
  exit?: string;
};

const ViewTransition: ComponentType<ViewTransitionLikeProps> = Reflect.get(React, "ViewTransition");

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

export interface ViewTransitionSuspenseProps {
  fallback: ReactNode;
  children: ReactNode;
  /** View transition class on the content as it arrives. Default `vt-enter`. */
  enter?: string;
  /** View transition class on the fallback as it leaves. Default `vt-exit`. */
  exit?: string;
}

/**
 * `<Suspense>` whose fallback fades out as the content comes in, through React
 * `<ViewTransition>`. Suspense reveals commit on retry lanes, which React
 * animates even outside `startTransition`. Needs a React build that exports
 * `ViewTransition`; the app supplies the `::view-transition-old(.vt-exit)` and
 * `::view-transition-new(.vt-enter)` CSS. Routers that commit route changes
 * synchronously (through `useSyncExternalStore`) do not animate here; use the
 * router's own view transition for pages.
 */
export function ViewTransitionSuspense({
  fallback,
  children,
  enter = "vt-enter",
  exit = "vt-exit",
}: ViewTransitionSuspenseProps) {
  return (
    <React.Suspense
      fallback={
        <ViewTransition default="none" exit={exit}>
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition default="none" enter={enter}>
        {children}
      </ViewTransition>
    </React.Suspense>
  );
}
