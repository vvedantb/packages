import { type ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { LazyMotion, domMax, m } from "motion/react";
import { Button } from "../../src/ui/button";
import { useMediaQuery } from "../../src/hooks/use-media-query";
import { pageTitleClass } from "../../src/ui/page-title";
import { cn } from "../../src/utils/cn";
import { motionDuration, motionEase } from "../../src/motion/presets";

const slotTransition = {
  duration: motionDuration.fast,
  ease: motionEase,
} as const;

type SlotProps = {
  /** When `false` the slot renders as a plain element. */
  enabled: boolean;
  /** Seconds before the slot enters. */
  delay?: number;
  className?: string;
  children: ReactNode;
};

/** A header slot that fades and lifts in. Needs an ancestor `LazyMotion`. */
function Slot({ enabled, delay = 0, className, children }: SlotProps) {
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...slotTransition, delay }}
    >
      {children}
    </m.div>
  );
}

/** The `h1` counterpart of `Slot`. */
function TitleSlot({ enabled, className, children }: SlotProps) {
  if (!enabled) return <h1 className={className}>{children}</h1>;
  return (
    <m.h1
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={slotTransition}
    >
      {children}
    </m.h1>
  );
}

export type PageHeaderBarProps = {
  title?: ReactNode;
  /**
   * Sits beside the title (inline layout only), before `headerRight` — for
   * navigation that belongs with "where am I" rather than the action cluster.
   * Centred over the title row at `sm`+; below that it takes its own row.
   */
  titleAfter?: ReactNode;
  /**
   * Sits in the title row right after the title (or back button), without
   * shrinking. Unlike `titleAfter` it is never centred over the row. Works in
   * both layouts: in `"stacked"` the title and `leftSection` share one row above
   * `description`.
   */
  leftSection?: ReactNode;
  /** Centred middle slot, shown with `headerColumns="three-at-md"`. */
  headerCenter?: ReactNode;
  /** Right-aligned action cluster. */
  headerRight?: ReactNode;
  /** Secondary refine row under the title (filters, search, segmented controls). */
  toolbar?: ReactNode;
  /** Route / view tabs under the title (and under the toolbar when both exist). */
  tabs?: ReactNode;
  /** Sub-text under the title (stacked layout only). */
  description?: ReactNode;
  /** Indent the title row by the card gutter (`px-4`). */
  insetHeader?: boolean;
  /** Centre the content in a `max-w-5xl` column with roomier padding. */
  comfortable?: boolean;
  /**
   * Centre the header and toolbar in a `max-w-5xl` column. Unlike
   * `comfortable` it keeps the default `p-3 sm:px-4` padding.
   */
  contentMaxWidth?: boolean;
  /**
   * Title size. `"auto"` (default): the page title standard when stacked,
   * responsive sizes when inline. `"page"`: the page title standard in either
   * layout, with a string title shown from `md` up.
   */
  titleScale?: "auto" | "page";
  /** Back button at the start of the title row (inline layout only). */
  showBack?: boolean;
  onBack?: () => void;
  /** Entry + `motion-base` animations. Opt-in so the package needs no animation plugin. */
  animated?: boolean;
  /**
   * Fade and lift the title block, `leftSection`, `headerCenter` (delay 0.06 s)
   * and `headerRight` (delay 0.1 s) in with `motion/react`. Default `false`.
   * Needs the app's `MotionProvider`, which sets reduced motion. Replaces the
   * CSS `animated` entry on those slots. The toolbar and tabs stay still.
   */
  headerMotion?: boolean;
  /**
   * Give the title row grid a `min-h-10` (40 px), so the title, back button and
   * actions centre in a row that is at least as tall as a `h-10` control, even
   * when the row holds only a title. Default `false`.
   */
  titleRowMinHeight?: boolean;
  /**
   * `"stacked"` (default): fixed `text-xl` title over an optional `description`;
   * a string title is hidden below `md`. `"inline"`: responsive title in a row
   * with `showBack` / `titleAfter`; a string title is hidden below `lg`.
   */
  titleLayout?: "stacked" | "inline";
  /** `"three-at-md"` reserves a centred middle column at `md` for `headerCenter`. */
  headerColumns?: "two" | "three-at-md";
  /**
   * Portal `headerRight` into a mobile top bar for string titles. When set and
   * the title is a string and `isDesktop` is `false`, `headerRight` is rendered
   * through this instead of in the row, and a header that would otherwise be
   * only a string title hides below `md`. Pair with `isDesktop`.
   */
  renderMobileActions?: (node: ReactNode) => ReactNode;
  /** Supply `useIsDesktop()`; pairs with `renderMobileActions`. */
  isDesktop?: boolean;
  /** Render nothing. For a page with no title, actions, toolbar or tabs. */
  hideHeader?: boolean;
  /** Hide the whole header block below `md` (it shows from `md` up). */
  hideHeaderOnMobile?: boolean;
};

/**
 * The page title row (title, actions, toolbar, tabs). Rendered above the page
 * body by `PageWrapper`, or placed directly by a split view that wants the
 * header inside its left column. App-specific behaviour (entry animations, the
 * title treatment, the centre column, and the mobile action portal) is opt-in
 * through props so one implementation serves apps that differ in each.
 */
export function PageHeaderBar({
  title,
  titleAfter,
  leftSection,
  headerCenter,
  headerRight,
  toolbar,
  tabs,
  description,
  insetHeader = false,
  comfortable = false,
  contentMaxWidth = false,
  titleScale = "auto",
  showBack = false,
  onBack,
  animated = false,
  headerMotion = false,
  titleRowMinHeight = false,
  titleLayout = "stacked",
  headerColumns = "two",
  renderMobileActions,
  isDesktop,
  hideHeader = false,
  hideHeaderOnMobile = false,
}: PageHeaderBarProps) {
  const isStringTitle = typeof title === "string";
  const hasToolbar = toolbar != null;
  const hasTabs = tabs != null;
  const inline = titleLayout === "inline";
  const maxWidth = comfortable || contentMaxWidth;
  const responsiveTitle = inline && titleScale === "auto";
  const threeCol = headerColumns === "three-at-md";

  // Below `sm` the title row cannot hold a second control, so `titleAfter`
  // drops to its own row.
  const isPhone = useMediaQuery("(max-width: 639px)");
  const titleAfterInline = titleAfter != null && !isPhone;
  const titleAfterOwnRow = titleAfter != null && isPhone;

  const headerRightInTopBar =
    renderMobileActions != null && isStringTitle && isDesktop === false;
  const headerRightInPage = headerRight != null && !headerRightInTopBar;
  const hideOnMobile =
    hideHeaderOnMobile ||
    (renderMobileActions != null && isStringTitle && !hasToolbar && !hasTabs);

  const titleClass = cn(
    "min-w-0 text-foreground",
    responsiveTitle
      ? "text-base font-semibold tracking-[-0.02em] sm:text-lg md:text-xl"
      : pageTitleClass,
    animated &&
      !headerMotion &&
      "animate-in fade-in slide-in-from-left-1 duration-200",
    isStringTitle
      ? responsiveTitle
        ? "hidden whitespace-nowrap text-balance lg:block"
        : "hidden text-balance whitespace-nowrap md:block"
      : "overflow-hidden",
  );

  if (hideHeader) return null;

  const cssSlotMotion = animated && !headerMotion;

  const bar = (
    <>
      {headerRightInTopBar && renderMobileActions
        ? renderMobileActions(headerRight)
        : null}
      <div
        className={cn(
          "relative",
          animated && "motion-base",
          comfortable ? "px-4 py-6 sm:px-6" : "p-3 sm:px-4",
          hideOnMobile && "hidden md:block",
        )}
      >
        <div
          className={cn(
            "relative grid items-center gap-2 sm:gap-3",
            titleRowMinHeight && "min-h-10",
            headerRightInPage
              ? threeCol
                ? "grid-cols-[minmax(0,1fr)_minmax(0,auto)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
                : "grid-cols-[minmax(0,1fr)_minmax(0,auto)]"
              : "grid-cols-1",
            maxWidth && "mx-auto w-full max-w-5xl",
            insetHeader && "px-4",
          )}
        >
          {inline ? (
            <div
              className={cn(
                "flex min-w-0 items-center gap-2 sm:gap-3",
                threeCol &&
                  headerRightInPage &&
                  !headerCenter &&
                  "md:col-span-2",
              )}
            >
              {showBack ? (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onBack ?? (() => window.history.back())}
                  aria-label="Go back"
                  className="motion-press max-sm:hit-target h-9 w-9 shrink-0 hover:scale-[1.03] active:scale-[0.96]"
                >
                  <IconArrowLeft size={16} className="text-muted-foreground" />
                </Button>
              ) : null}
              {title ? (
                <TitleSlot
                  enabled={headerMotion}
                  className={cn(
                    "flex-1",
                    titleAfterInline && "sm:max-w-[calc(75%-4rem)]",
                    titleClass,
                  )}
                >
                  {title}
                </TitleSlot>
              ) : null}
              {leftSection != null ? (
                <Slot enabled={headerMotion} className="shrink-0">
                  {leftSection}
                </Slot>
              ) : null}
              {titleAfterInline ? (
                <div className="shrink-0 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
                  {titleAfter}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={cn(
                "flex min-w-0 flex-col gap-1",
                threeCol &&
                  headerRightInPage &&
                  !headerCenter &&
                  "md:col-span-2",
              )}
            >
              {leftSection != null ? (
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  {title ? (
                    <TitleSlot
                      enabled={headerMotion}
                      className={cn("flex-1", titleClass)}
                    >
                      {title}
                    </TitleSlot>
                  ) : null}
                  <Slot enabled={headerMotion} className="shrink-0">
                    {leftSection}
                  </Slot>
                </div>
              ) : title ? (
                <TitleSlot enabled={headerMotion} className={titleClass}>
                  {title}
                </TitleSlot>
              ) : null}
              {description ? (
                <p className="hidden text-sm text-muted-foreground md:block">
                  {description}
                </p>
              ) : null}
            </div>
          )}
          {headerCenter ? (
            <Slot
              enabled={headerMotion}
              delay={0.06}
              className={cn(
                "hidden min-w-0 justify-center md:flex",
                cssSlotMotion && "animate-in fade-in duration-200",
              )}
            >
              <div className="w-full max-w-xl">{headerCenter}</div>
            </Slot>
          ) : null}
          {headerRightInPage ? (
            <Slot
              enabled={headerMotion}
              delay={0.1}
              className={cn(
                "flex min-h-10 max-sm:min-w-0 max-sm:flex-wrap items-center justify-end gap-1.5 sm:gap-2 justify-self-end",
                cssSlotMotion &&
                  "animate-in fade-in slide-in-from-right-1 duration-200",
              )}
            >
              {headerRight}
            </Slot>
          ) : null}
        </div>
        {titleAfterOwnRow ? (
          <div className="mt-2 min-w-0 overflow-x-auto scrollbar-none">
            {titleAfter}
          </div>
        ) : null}
        {headerCenter ? (
          <Slot
            enabled={headerMotion}
            delay={0.06}
            className={cn(
              "mt-2 md:hidden",
              cssSlotMotion && "animate-in fade-in duration-200",
            )}
          >
            {headerCenter}
          </Slot>
        ) : null}
        {hasToolbar || hasTabs ? (
          <div
            className={cn(
              "mt-3 space-y-3",
              maxWidth && "mx-auto w-full max-w-5xl",
              insetHeader && "px-4",
            )}
          >
            {hasToolbar ? (
              <div className="flex min-h-9 flex-wrap items-center gap-1.5 sm:gap-2">
                {toolbar}
              </div>
            ) : null}
            {hasTabs ? (
              <div className="min-w-0 max-sm:max-w-full max-sm:overflow-x-auto scrollbar">
                {tabs}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  return headerMotion ? <LazyMotion features={domMax}>{bar}</LazyMotion> : bar;
}
