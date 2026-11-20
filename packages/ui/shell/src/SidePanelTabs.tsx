import {
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { dockNudge, dockPopIn, dockPopOut } from "../../src/motion/dock-motion";
import { Tabs, TabsList, TabsTrigger } from "../../src/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../src/ui/tooltip";
import { cn } from "../../src/utils/cn";

/** Width of the icon rail from `md` up. A collapsed side panel is this wide, not 0. */
export const SIDE_PANEL_RAIL_WIDTH_PX = 44;
/** Width of the rail with a label under each icon (`labelled`). */
export const SIDE_PANEL_RAIL_LABELLED_WIDTH_PX = 76;

/** Half the arrow's side (`size-4`), so its centre lands on the tab centre. */
const ARROW_HALF_PX = 8;

/* Relative to the frame, and scoped to its rail: content inside the card can
   have tab lists of its own. */
const RAIL_TABLIST_SELECTOR = ':scope > [data-side-panel-rail] [role="tablist"]';
const ACTIVE_TAB_SELECTOR = `${RAIL_TABLIST_SELECTOR} [role="tab"][data-state="active"]`;
const CARD_SELECTOR = "[data-side-panel-card]";
const ARROW_SELECTOR = ":scope > [data-side-panel-arrow]";

function activeTabOf(card: HTMLElement): HTMLElement | null {
  return card.parentElement?.querySelector<HTMLElement>(ACTIVE_TAB_SELECTOR) ?? null;
}

function arrowOf(card: HTMLElement): HTMLElement | null {
  return card.parentElement?.querySelector<HTMLElement>(ARROW_SELECTOR) ?? null;
}

/**
 * Closing a side panel: shrink the visible card in `root` back into its
 * active tab, then run `collapse`. With no visible card, or motion off
 * (`dockMotionOff`), it collapses at once.
 */
export function popOutSidePanel(root: HTMLElement | null, collapse: () => void) {
  const card = root?.querySelector<HTMLElement>(CARD_SELECTOR) ?? null;
  dockPopOut(card, card ? activeTabOf(card) : null, "right", collapse, card ? arrowOf(card) : null);
}

/**
 * Keeps the card's arrow level with the active rail tab, and plays the card's
 * dock motion: pop in when the card appears, a settle when the active tab
 * changes. It writes the transform straight to the node (no React state), as
 * the tab pill does: the first placement snaps, later moves slide. The arrow
 * hides when the active tab is scrolled out of the card's height. Measure
 * before animating: a scaled card reports a scaled rect.
 */
function useActiveTabArrow(
  frameRef: RefObject<HTMLDivElement | null>,
  cardRef: RefObject<HTMLDivElement | null>,
  arrowRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const card = cardRef.current;
    const arrow = arrowRef.current;
    if (!frame || !card || !arrow) return;
    let placed = false;
    // Start from what is on screen, so a mount does not pop.
    let wasOpen = card.getBoundingClientRect().width > 0;
    let lastTab = frame.querySelector(ACTIVE_TAB_SELECTOR);
    const sync = () => {
      const tab = frame.querySelector<HTMLElement>(ACTIVE_TAB_SELECTOR);
      const f = frame.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const open = c.width > 0;
      const opened = open && !wasOpen;
      const switched = open && wasOpen && tab !== null && tab !== lastTab;
      wasOpen = open;
      if (tab) lastTab = tab;
      if (!tab || !open) {
        arrow.style.opacity = "0";
        placed = false;
        return;
      }
      const t = tab.getBoundingClientRect();
      const centre = t.top + t.height / 2;
      const inCard = centre > c.top + 2 * ARROW_HALF_PX && centre < c.bottom - 2 * ARROW_HALF_PX;
      if (!inCard) {
        arrow.style.opacity = "0";
      } else {
        if (!placed) arrow.style.transition = "none";
        arrow.style.left = `${c.right - f.left - ARROW_HALF_PX - 1}px`;
        arrow.style.transform = `translateY(${centre - f.top - ARROW_HALF_PX}px) rotate(45deg)`;
        arrow.style.opacity = "1";
        if (!placed) {
          void arrow.offsetWidth;
          arrow.style.transition = "";
          placed = true;
        }
      }
      if (opened) dockPopIn(card, tab, "right", arrow);
      else if (switched) dockNudge(card, tab, "right");
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const resize = new ResizeObserver(sync);
    resize.observe(frame);
    // The card un-hides without the frame changing size.
    resize.observe(card);
    const mutation = new MutationObserver(sync);
    mutation.observe(frame, { subtree: true, attributes: true, attributeFilter: ["data-state"] });
    const list = frame.querySelector(RAIL_TABLIST_SELECTOR);
    if (list) resize.observe(list);
    // Tabs can enter with a short slide and the list re-centres as tabs come
    // and go, so measure again once each motion settles.
    const settle = ["scroll", "animationend", "transitionend"] as const;
    for (const type of settle) frame.addEventListener(type, sync, true);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      for (const type of settle) frame.removeEventListener(type, sync, true);
    };
  }, [frameRef, cardRef, arrowRef]);
}

export type SidePanelTabsFrameProps = {
  /** From `md` up: hides the card and leaves the rail. */
  collapsed?: boolean;
  /** The tab rail: a `SidePanelTabs.Rail`. */
  rail: ReactNode;
  /** The content of the active tab. */
  children?: ReactNode;
  className?: string;
  /** Merged onto the content card (tone, radius, margins). */
  cardClassName?: string;
  /** Merged onto the arrow. Give it the card's tone when `cardClassName` changes it. */
  arrowClassName?: string;
};

/**
 * A side panel with its tabs on a rail. From `md` up: the rail on the right
 * edge, the content a rounded card beside it with an arrow that points at the
 * active tab; `collapsed` hides the card and the rail stays. Below `md`: a
 * column, the tab strip on top and the content edge to edge. The card pops
 * out of the active tab when it opens and settles on a tab switch; close it
 * through `popOutSidePanel`.
 */
function Frame({ collapsed = false, rail, children, className, cardClassName, arrowClassName }: SidePanelTabsFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  useActiveTabArrow(frameRef, cardRef, arrowRef);
  return (
    <div ref={frameRef} className={cn("relative flex h-full min-h-0 flex-col md:flex-row-reverse", className)}>
      {rail}
      {/* The arrow comes before the card, and the card is positioned, so the
          card paints over the arrow's inner half: only the tip shows. */}
      <div
        ref={arrowRef}
        aria-hidden
        data-side-panel-arrow=""
        className={cn(
          "t-side-panel-arrow pointer-events-none absolute top-0 hidden size-4 rounded-xs bg-surface opacity-0 md:block",
          collapsed && "md:hidden",
          arrowClassName,
        )}
      />
      <div
        ref={cardRef}
        data-side-panel-card=""
        className={cn(
          "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-surface md:my-2 md:mr-1.5 md:rounded-lg",
          collapsed && "md:hidden",
          cardClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export type SidePanelTabsRailProps = ComponentPropsWithoutRef<"div"> & {
  /** The wider rail, for tabs with `layout="stacked"`. Default `false`. */
  labelled?: boolean;
};

/** The rail column: holds a `SidePanelTabs.List`, and any `ButtonTrack` of tools after it. */
function Rail({ labelled = false, className, ...props }: SidePanelTabsRailProps) {
  return (
    <div
      data-side-panel-rail=""
      {...props}
      className={cn(
        "flex shrink-0 items-center gap-1 px-1.5 py-1 md:relative md:z-20 md:h-full md:w-11 md:flex-col md:items-center md:overflow-hidden md:px-1 md:pb-1.5 md:pt-3",
        labelled && "md:w-[76px]",
        className,
      )}
    />
  );
}

export type SidePanelTabsListProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Fills the wider rail, for tabs with `layout="stacked"`. Default `false`. */
  labelled?: boolean;
  /** Accessible name of the tab list. */
  "aria-label"?: string;
  /** Merged onto the tabs root. */
  className?: string;
  /** Merged onto the tab list (the trough). */
  listClassName?: string;
  /** `SidePanelTabs.Tab` items. */
  children?: ReactNode;
};

/**
 * The tabs of the rail on one trough with a sliding pill. Activation is
 * manual: a tab selects on press, not on focus, so a press on the selected
 * tab can mean something else (`onReselect`).
 */
function List({ value, onValueChange, labelled = false, className, listClassName, children, ...props }: SidePanelTabsListProps) {
  return (
    <Tabs
      activationMode="manual"
      value={value}
      onValueChange={onValueChange}
      className={cn("min-w-0 flex-1 md:flex md:min-h-0 md:w-full md:flex-col md:items-center md:justify-center-safe", className)}
    >
      <TabsList
        aria-label={props["aria-label"]}
        className={cn(
          "scrollbar-none h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-xl border-0 bg-default p-0.5 shadow-none md:max-w-none md:flex-col md:overflow-x-hidden md:overflow-y-auto [&>.t-tabs-pill]:bg-segment",
          labelled && "md:w-full",
          listClassName,
        )}
      >
        {children}
      </TabsList>
    </Tabs>
  );
}

/**
 * How one tab is arranged. `"icon"` (default): icon only from `md` up, the
 * label in a tooltip. `"stacked"`: icon over label, for a `labelled` rail.
 * `"row"`: icon beside label, for a phone strip.
 */
export type SidePanelTabLayout = "row" | "icon" | "stacked";

const TAB_LAYOUT_CLASS: Record<SidePanelTabLayout, string> = {
  row: "",
  icon: "md:w-8 md:justify-center md:px-0",
  stacked: "md:h-auto md:w-full md:flex-col md:justify-center md:gap-0.5 md:px-1 md:py-1.5",
};

/* Selection is Radix's `data-state` on the trigger, so the idle and active
   icons swap in CSS. */
const ICON_SLOT_CLASS = "contents [&_svg]:size-4 [&_svg]:shrink-0";

export type SidePanelTabsTabProps = {
  value: string;
  label: string;
  /** The icon. Without `activeIcon` its stroke thickens while the tab is selected. */
  icon: ReactNode;
  /** Shown in place of `icon` while the tab is selected (a filled variant). */
  activeIcon?: ReactNode;
  /** Default `"icon"`. */
  layout?: SidePanelTabLayout;
  /** How many items the tab holds. Above 0 it shows as a badge, in place of the `indicator` dot. */
  count?: number;
  /** A dot on the tab. `"activity"` pulses (something is live); `"content"` is still (something waits for the reader). */
  indicator?: "activity" | "content";
  /** Accessible name of the count badge or the dot. */
  indicatorLabel?: string;
  /** A press on this tab while it is selected (for example to show or hide the card). Radix skips `onValueChange` then. */
  onReselect?: () => void;
  /** Second tooltip line: what a press on the selected tab does. */
  reselectHint?: string;
  className?: string;
};

/* Radix selects a tab on mouse down (or Enter / Space key down), so read the
   state there: by `click` a newly picked tab is already active. */
function isReselectPress(event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) {
  const press =
    "button" in event
      ? event.button === 0 && !event.ctrlKey
      : !event.repeat && (event.key === "Enter" || event.key === " ");
  return press && event.currentTarget.dataset.state === "active";
}

/** One tab of a `SidePanelTabs.List`. */
function Tab({
  value,
  label,
  icon,
  activeIcon,
  layout = "icon",
  count,
  indicator,
  indicatorLabel,
  onReselect,
  reselectHint,
  className,
}: SidePanelTabsTabProps) {
  const labelHidden = layout === "icon";
  const shownCount = count !== undefined && count > 0 ? count : undefined;
  const trigger = (
    <TabsTrigger
      value={value}
      aria-label={labelHidden ? label : undefined}
      className={cn(
        "group/tab h-8 shrink-0 gap-1.5 px-2.5 text-xs data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-segment/50 data-[state=inactive]:hover:text-foreground max-sm:h-10",
        TAB_LAYOUT_CLASS[layout],
        className,
      )}
      onMouseDown={(event) => {
        if (isReselectPress(event)) onReselect?.();
      }}
      onKeyDown={(event) => {
        if (isReselectPress(event)) onReselect?.();
      }}
    >
      {activeIcon === undefined ? (
        <span className={cn(ICON_SLOT_CLASS, "group-data-[state=active]/tab:[&_svg]:stroke-[2.75]")}>{icon}</span>
      ) : (
        <>
          <span className={cn(ICON_SLOT_CLASS, "group-data-[state=active]/tab:hidden")}>{icon}</span>
          <span className={cn(ICON_SLOT_CLASS, "hidden group-data-[state=active]/tab:contents")}>{activeIcon}</span>
        </>
      )}
      {layout === "row" ? label : null}
      {layout === "stacked" ? <span className="w-full truncate text-3xs leading-3">{label}</span> : null}
      {shownCount !== undefined ? (
        <span
          aria-label={indicatorLabel}
          className={cn(
            "inline-flex h-3.5 min-w-3.5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium leading-none text-primary-foreground tabular-nums",
            layout !== "row" && "absolute right-0 top-0",
          )}
        >
          {shownCount > 99 ? "99+" : shownCount}
        </span>
      ) : indicator ? (
        <span
          aria-label={indicatorLabel}
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-primary",
            layout !== "row" && "absolute right-0.5 top-0.5",
            indicator === "activity" && "animate-pulse ring-2 ring-primary/30",
          )}
        />
      ) : null}
    </TabsTrigger>
  );
  // A visible label needs no tooltip that repeats it.
  if (!labelHidden) return trigger;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* The span keeps the Tooltip `data-state` off the trigger: Radix
            Tabs uses `data-state` for active and inactive. */}
        <span className="inline-flex">{trigger}</span>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {label}
        {reselectHint ? <span className="block opacity-70">{reselectHint}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Tabs on a rail beside a content card, for a side panel: `SidePanelTabs.Frame`
 * holds a `SidePanelTabs.Rail` (a `SidePanelTabs.List` of `SidePanelTabs.Tab`,
 * then any `ButtonTrack direction="column"` of tools) and the content.
 * It does not depend on the `AppShell` variant.
 */
export const SidePanelTabs = { Frame, Rail, List, Tab };
