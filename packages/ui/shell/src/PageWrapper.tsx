import { type ReactNode } from "react";
import { PageHeaderBar, type PageHeaderBarProps } from "./PageHeaderBar";
import { cn } from "../../src/utils/cn";

export type PageWrapperProps = PageHeaderBarProps & {
  children: ReactNode;
  /**
   * Hand the page body the full remaining height instead of letting it scroll.
   * The body becomes a flex column that owns its own overflow (lists, split
   * panes, editors). Default `false`: the body scrolls.
   */
  fillHeight?: boolean;
  /** Pad the body with the page gutter. Default `true`. */
  childPadding?: boolean;
  /** Add the themed `scrollbar` chrome to the scrolling body (non-`fillHeight`). */
  bodyScrollbar?: boolean;
  /**
   * Publish the title to the app's page-title context. Pass the app's
   * `usePageTitleSync` (from its `createPageTitleContext` kit); it is called
   * unconditionally on every render, so it must be a hook.
   */
  useSyncTitle: (title: ReactNode) => void;
};

/**
 * A full-height page: a `PageHeaderBar` over a scrolling (or height-filling)
 * body, with the title mirrored into the app's page-title context. The header
 * props pass straight through; only the body and the title-sync wiring are
 * added here.
 */
export function PageWrapper({
  children,
  fillHeight = false,
  childPadding = true,
  bodyScrollbar = false,
  useSyncTitle,
  ...header
}: PageWrapperProps) {
  const { title, comfortable = false, animated = false } = header;
  useSyncTitle(title);

  return (
    <div
      className={cn(
        "h-full min-h-0 flex-1 overflow-hidden",
        animated && "animate-in fade-in duration-300",
      )}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <PageHeaderBar {...header} />
        <div
          className={cn(
            "min-h-0 flex-1",
            fillHeight
              ? "flex flex-col overflow-hidden"
              : cn("overflow-auto", bodyScrollbar && "scrollbar"),
          )}
        >
          <div
            className={cn(
              "flex flex-col gap-4",
              animated && "animate-in fade-in slide-in-from-bottom-1 duration-300",
              childPadding &&
                (comfortable ? "p-4 pt-0 sm:px-6" : "p-3 pt-0 sm:px-4"),
              fillHeight ? "min-h-0 flex-1 overflow-hidden" : "min-h-full",
            )}
          >
            {comfortable ? (
              <div
                className={cn(
                  "mx-auto w-full max-w-5xl",
                  fillHeight && "flex min-h-0 flex-1 flex-col",
                )}
              >
                {children}
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
