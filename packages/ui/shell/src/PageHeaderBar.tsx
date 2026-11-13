import { type ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "../../src/ui/button";
import { useMediaQuery } from "../../src/hooks/use-media-query";
import { cn } from "../../src/utils/cn";

export type PageHeaderBarProps = {
  title?: ReactNode;
  /**
   * Sits beside the title (inline layout only), before `headerRight` — for
   * navigation that belongs with "where am I" rather than the action cluster.
   * Centred over the title row at `sm`+; below that it takes its own row.
   */
  titleAfter?: ReactNode;
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
  /** Back button at the start of the title row (inline layout only). */
  showBack?: boolean;
  onBack?: () => void;
  /** Entry + `motion-base` animations. Opt-in so the package needs no animation plugin. */
  animated?: boolean;
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
  headerCenter,
  headerRight,
  toolbar,
  tabs,
  description,
  insetHeader = false,
  comfortable = false,
  showBack = false,
  onBack,
  animated = false,
  titleLayout = "stacked",
  headerColumns = "two",
  renderMobileActions,
  isDesktop,
}: PageHeaderBarProps) {
  const isStringTitle = typeof title === "string";
  const hasToolbar = toolbar != null;
  const hasTabs = tabs != null;
  const inline = titleLayout === "inline";
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
    renderMobileActions != null && isStringTitle && !hasToolbar && !hasTabs;

  const titleClass = cn(
    "min-w-0 text-foreground",
    inline
      ? "text-base font-semibold tracking-[-0.02em] sm:text-lg md:text-xl"
      : "text-xl font-semibold leading-tight tracking-tight",
    animated && "animate-in fade-in slide-in-from-left-1 duration-300",
    isStringTitle
      ? inline
        ? "hidden whitespace-nowrap text-balance lg:block"
        : "hidden text-balance whitespace-nowrap md:block"
      : "overflow-hidden",
  );

  return (
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
            headerRightInPage
              ? threeCol
                ? "grid-cols-[minmax(0,1fr)_minmax(0,auto)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
                : "grid-cols-[minmax(0,1fr)_minmax(0,auto)]"
              : "grid-cols-1",
            comfortable && "mx-auto w-full max-w-5xl",
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
                <h1
                  className={cn(
                    "flex-1",
                    titleAfterInline && "sm:max-w-[calc(75%-4rem)]",
                    titleClass,
                  )}
                >
                  {title}
                </h1>
              ) : null}
              {titleAfterInline ? (
                <div className="shrink-0 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
                  {titleAfter}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-1">
              {title ? <h1 className={titleClass}>{title}</h1> : null}
              {description ? (
                <p className="hidden text-sm text-muted-foreground md:block">
                  {description}
                </p>
              ) : null}
            </div>
          )}
          {headerCenter ? (
            <div
              className={cn(
                "hidden min-w-0 justify-center md:flex",
                animated && "animate-in fade-in duration-300",
              )}
            >
              <div className="w-full max-w-xl">{headerCenter}</div>
            </div>
          ) : null}
          {headerRightInPage ? (
            <div
              className={cn(
                "flex min-h-10 max-sm:min-w-0 max-sm:flex-wrap items-center justify-end gap-1.5 sm:gap-2 justify-self-end",
                animated && "animate-in fade-in slide-in-from-right-1 duration-300",
              )}
            >
              {headerRight}
            </div>
          ) : null}
        </div>
        {titleAfterOwnRow ? (
          <div className="mt-2 min-w-0 overflow-x-auto scrollbar-none">
            {titleAfter}
          </div>
        ) : null}
        {headerCenter ? (
          <div
            className={cn(
              "mt-2 md:hidden",
              animated && "animate-in fade-in duration-300",
            )}
          >
            {headerCenter}
          </div>
        ) : null}
        {hasToolbar || hasTabs ? (
          <div
            className={cn(
              "mt-3 space-y-3",
              comfortable && "mx-auto w-full max-w-5xl",
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
}
