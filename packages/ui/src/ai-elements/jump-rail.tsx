"use client";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import { tokenTransition } from "../motion/presets";
import { cn } from "../utils/cn";
import { useCn } from "../ui/ui-config";
import {
  JUMP_RAIL_MIN_VISIBLE_ITEMS,
  resolveJumpRailHeightStyle,
  resolveJumpRailIndexFromPointer,
  resolveJumpRailTickLevelStyle,
  resolveJumpRailTickWidthClass,
  resolveJumpRailTooltipTranslate,
  resolveJumpRailTopPercent,
} from "./jump-rail-geometry";

export interface JumpRailItem {
  id: string;
  /** First line of the preview card; also the button's accessible label. */
  title: string;
  /** Up to three lines under the title. */
  preview?: string | null;
  /** Heading level (1 is the longest tick). Deeper levels get shorter, indented ticks. */
  level?: number;
}

export interface JumpRailProps {
  items: readonly JumpRailItem[];
  /** The scroll container. Read when the rail observes and scrolls. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** Alternative to `scrollRef`: returns the scroll container. */
  getScrollElement?: () => HTMLElement | null;
  /** Attribute that holds an item id on its target. Default `data-message-id`. */
  targetAttribute?: string;
  /** Replaces the `[targetAttribute="id"]` lookup inside the scroll container. */
  resolveTarget?: (root: HTMLElement, id: string) => HTMLElement | null;
  /**
   * Called when the target is not in the DOM (for example a windowed
   * transcript). The consumer renders it and scrolls to it.
   */
  onReveal?: (id: string) => void;
  /** Called just before `onReveal`, for example `stopScroll` from use-stick-to-bottom. */
  onBeforeScroll?: () => void;
  /**
   * Called after the user picks an item by click or Enter/Space, once the
   * scroll has started or `onReveal` has run. For example, to move focus to the
   * target for keyboard users.
   */
  onSelect?: (id: string) => void;
  /**
   * Changing this re-observes the targets. Use it when rows render later or
   * the window grows, for example the first rendered id.
   */
  observeKey?: string | number | null;
  /** The rail renders nothing below this many items. Default 2. */
  minVisibleItems?: number;
  /** Merged into the wrapper classes, which place the rail. */
  className?: string;
  /** Wrapper `aria-label`. Default "Jump to message". */
  ariaLabel?: string;
  /** Start of the button label, followed by the active title. Default "Jump to message". */
  buttonLabel?: string;
  /** Button label subject while no item is active. Default "User message". */
  fallbackLabel?: string;
  /** Wrapper `data-testid`. Default `jump-rail`. */
  testId?: string;
}

const DEFAULT_WRAPPER_CLASS =
  "pointer-events-none absolute inset-y-0 left-0 z-30 hidden w-14 lg:pointer-fine:block";

function escapeAttributeValue(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function findTarget(
  root: HTMLElement,
  id: string,
  attribute: string,
  resolve: ((root: HTMLElement, id: string) => HTMLElement | null) | undefined,
): HTMLElement | null {
  if (resolve) return resolve(root, id);
  return root.querySelector<HTMLElement>(`[${attribute}="${escapeAttributeValue(id)}"]`);
}

/**
 * t3code-style timeline minimap: a short, vertically centred rail of ticks,
 * one per item. Hover scrubbing shows a floating preview; click jumps to the
 * item's target inside the scroll container. Ticks for targets in the top part
 * of the viewport are highlighted. Place it in a `relative` parent.
 */
export function JumpRail({
  items,
  scrollRef,
  getScrollElement,
  targetAttribute = "data-message-id",
  resolveTarget,
  onReveal,
  onBeforeScroll,
  onSelect,
  observeKey,
  minVisibleItems = JUMP_RAIL_MIN_VISIBLE_ITEMS,
  className,
  ariaLabel = "Jump to message",
  buttonLabel = "Jump to message",
  fallbackLabel = "User message",
  testId = "jump-rail",
}: JumpRailProps) {
  const merge = useCn();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [inViewIds, setInViewIds] = useState<ReadonlySet<string>>(() => new Set());

  // Latest props for the effect and handlers, so an inline getter or resolver
  // does not rebuild the observer on every render.
  const latest = useRef({ scrollRef, getScrollElement, resolveTarget, targetAttribute });
  latest.current = { scrollRef, getScrollElement, resolveTarget, targetAttribute };
  const readRoot = () =>
    latest.current.getScrollElement?.() ?? latest.current.scrollRef?.current ?? null;

  const idsKey = JSON.stringify(items.map((item) => item.id));
  const count = items.length;

  useEffect(() => {
    const root = readRoot();
    if (!root || count < minVisibleItems) return;
    const ids = JSON.parse(idsKey) as string[];

    const idByTarget = new Map<Element, string>();
    for (const id of ids) {
      const target = findTarget(
        root,
        id,
        latest.current.targetAttribute,
        latest.current.resolveTarget,
      );
      if (target) idByTarget.set(target, id);
    }
    if (idByTarget.size === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = idByTarget.get(entry.target);
          if (id === undefined) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        setInViewIds(new Set(visible));
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    for (const target of idByTarget.keys()) observer.observe(target);
    return () => observer.disconnect();
  }, [idsKey, count, minVisibleItems, observeKey, scrollRef]);

  const scrollToItem = (id: string) => {
    const root = readRoot();
    const target = root
      ? findTarget(root, id, targetAttribute, resolveTarget)
      : null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      onSelect?.(id);
      return;
    }
    // Rendering earlier rows grows the content; a reader stuck to the bottom
    // would be pulled back down instead of reaching the item.
    onBeforeScroll?.();
    onReveal?.(id);
    onSelect?.(id);
  };

  const indexFromPointer = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return resolveJumpRailIndexFromPointer({
      itemCount: count,
      railTop: rect.top,
      railHeight: rect.height,
      pointerY: event.clientY,
    });
  };

  const moveHoverIndex = (delta: number) => {
    setHoverIndex((current) => Math.max(0, Math.min(count - 1, (current ?? 0) + delta)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHoverIndex(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHoverIndex(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setHoverIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHoverIndex(count - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const active = hoverIndex !== null ? (items[hoverIndex] ?? null) : null;
      if (active) scrollToItem(active.id);
    }
  };

  if (count < minVisibleItems) return null;

  const activeIndex = hoverIndex !== null && hoverIndex < count ? hoverIndex : null;
  const activeItem = activeIndex === null ? null : (items[activeIndex] ?? null);
  const activeTopPercent =
    activeIndex === null ? 0 : resolveJumpRailTopPercent(activeIndex, count);
  const activeTranslate =
    activeIndex === null ? "-50%" : resolveJumpRailTooltipTranslate(activeIndex, count);

  return (
    <div
      className={merge(DEFAULT_WRAPPER_CLASS, className)}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <div className="relative h-full w-full select-none">
        <button
          type="button"
          aria-label={`${buttonLabel}: ${activeItem?.title ?? fallbackLabel}`}
          className="pointer-events-auto absolute top-1/2 left-2 w-10 -translate-y-1/2 cursor-pointer bg-transparent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/70"
          style={{ height: resolveJumpRailHeightStyle(count) }}
          onBlur={() => setHoverIndex(null)}
          onFocus={() => setHoverIndex((current) => current ?? 0)}
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            setHoverIndex(indexFromPointer(event));
          }}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={(event) => {
            const nextIndex = indexFromPointer(event);
            const next = nextIndex === null ? null : (items[nextIndex] ?? null);
            if (next) scrollToItem(next.id);
            event.currentTarget.blur();
          }}
          onKeyDown={handleKeyDown}
        >
          <div className="absolute top-0 left-3 h-full w-px bg-border/15" />
          {items.map((item, index) => {
            const distance = activeIndex === null ? null : Math.abs(index - activeIndex);
            const inView = inViewIds.has(item.id);
            const levelStyle = resolveJumpRailTickLevelStyle(distance, item.level);
            return (
              <span
                key={item.id}
                aria-hidden="true"
                data-in-view={inView ? "true" : "false"}
                {...(item.level === undefined ? {} : { "data-level": item.level })}
                className={cn(
                  "pointer-events-none absolute left-0 h-0.5 -translate-y-1/2 rounded-full bg-muted-foreground/35 transition-colors data-[in-view=true]:bg-foreground/90",
                  levelStyle === undefined ? resolveJumpRailTickWidthClass(distance) : undefined,
                  distance === 0 && "bg-muted-foreground/75",
                )}
                style={{
                  top: `${resolveJumpRailTopPercent(index, count)}%`,
                  ...levelStyle,
                }}
              />
            );
          })}
          <LazyMotion features={domAnimation}>
            <AnimatePresence>
              {activeItem ? (
                <m.span
                  key={activeItem.id}
                  className="pointer-events-none absolute left-8 w-80 rounded-xl bg-popover/95 p-3 text-left text-popover-foreground smooth-shadow-ring-xl shadow-black/25 backdrop-blur-sm"
                  style={{
                    top: `${activeTopPercent}%`,
                    transform: `translateY(${activeTranslate})`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={tokenTransition.fast}
                >
                  <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-5">
                    {activeItem.title}
                  </span>
                  {activeItem.preview ? (
                    <span className="mt-1 line-clamp-3 text-sm leading-5 text-muted-foreground">
                      {activeItem.preview}
                    </span>
                  ) : null}
                </m.span>
              ) : null}
            </AnimatePresence>
          </LazyMotion>
        </button>
      </div>
    </div>
  );
}
