import { type ReactNode } from "react";
import { LazyMotion, domMax, m } from "motion/react";
import { PageHeaderBar, type PageHeaderBarProps } from "./PageHeaderBar";
import { cn } from "../../src/utils/cn";
import {
  motionDistance,
  motionDuration,
  motionEase,
} from "../../src/motion/presets";

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
  /**
   * Add the themed scrollbar chrome to the scrolling body (non-`fillHeight`).
   * `true`: `scrollbar`. `"thin"`: `scrollbar-thin`.
   */
  bodyScrollbar?: boolean | "thin";
  /**
   * `"owned"` (default): a full-height shell; the body scrolls or fills.
   * `"unbounded"`: no height ownership. The page is the header over the padded
   * children and the parent scrolls. `fillHeight`, `scrollRef`, `bodyMotion`
   * and `bodyScrollbar` have no effect.
   */
  scrollMode?: "owned" | "unbounded";
  /** Ref callback for the scrolling body (virtualised lists). `"owned"` only. */
  scrollRef?: (el: HTMLDivElement | null) => void;
  /**
   * Fade and lift the body in with `motion/react` (`motionDuration.base`,
   * delayed 0.12 s). Default `false`. Separate from the CSS `animated` prop.
   */
  bodyMotion?: boolean;
  /**
   * Classes for the padded content box. Merged after the defaults, so a class
   * such as `gap-8` replaces `gap-4`. Pair `childPadding={false}` with your own
   * padding classes here.
   */
  bodyClassName?: string;
};

/**
 * A full-height page: a `PageHeaderBar` over a scrolling (or height-filling)
 * body. The header props pass straight through; only the body is added here.
 * To mirror the title into the app's page-title context, call the app's
 * `usePageTitleSync(title)` in the component that renders this one.
 */
export function PageWrapper({
  children,
  fillHeight = false,
  childPadding = true,
  bodyScrollbar = false,
  scrollMode = "owned",
  scrollRef,
  bodyMotion = false,
  bodyClassName,
  ...header
}: PageWrapperProps) {
  const { comfortable = false, contentMaxWidth = false, animated = false } =
    header;

  const content = comfortable || contentMaxWidth ? (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl",
        scrollMode === "owned" && fillHeight && "flex min-h-0 flex-1 flex-col",
      )}
    >
      {children}
    </div>
  ) : (
    children
  );

  if (scrollMode === "unbounded") {
    return (
      <div>
        <PageHeaderBar {...header} />
        <div
          className={cn(
            childPadding &&
              (comfortable
                ? "px-4 pb-8 pt-0 sm:px-6"
                : "px-3 pb-6 pt-0 sm:px-4"),
            bodyClassName,
          )}
        >
          {content}
        </div>
      </div>
    );
  }

  const bodyClass = cn(
    "min-h-0 flex-1",
    fillHeight
      ? "flex flex-col overflow-hidden"
      : cn(
          bodyScrollbar === "thin" ? "overflow-y-auto" : "overflow-auto",
          bodyScrollbar === "thin"
            ? "scrollbar-thin"
            : bodyScrollbar && "scrollbar",
        ),
  );

  const inner = (
    <div
      className={cn(
        "flex flex-col gap-4",
        animated && "animate-in fade-in slide-in-from-bottom-1 duration-200",
        childPadding &&
          (comfortable ? "p-4 pt-0 sm:px-6" : "p-3 pt-0 sm:px-4"),
        fillHeight ? "min-h-0 flex-1 overflow-hidden" : "min-h-full",
        bodyClassName,
      )}
    >
      {content}
    </div>
  );

  return (
    <div
      className={cn(
        "h-full min-h-0 flex-1 overflow-hidden",
        animated && "animate-in fade-in duration-200",
      )}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <PageHeaderBar {...header} />
        {bodyMotion ? (
          <LazyMotion features={domMax}>
            <m.div
              ref={scrollRef}
              className={bodyClass}
              initial={{ opacity: 0, y: motionDistance.pageY }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionDuration.base,
                ease: motionEase,
                delay: 0.12,
              }}
            >
              {inner}
            </m.div>
          </LazyMotion>
        ) : (
          <div ref={scrollRef} className={bodyClass}>
            {inner}
          </div>
        )}
      </div>
    </div>
  );
}
