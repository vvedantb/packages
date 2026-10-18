"use client";
import type { ComponentProps, ReactNode } from "react";
import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/button";
import { cn } from "../utils/cn";
import { flatInteractiveClass } from "../ui/surface-classes";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { fastTransition } from "../motion/presets.alt";
export type SuggestionsProps = {
  className?: string;
  children?: ReactNode;
  orientation?: "horizontal" | "vertical";
};
function HorizontalSuggestions({
  className,
  children,
}: Pick<SuggestionsProps, "className" | "children">) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const checkScrollability = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener("scroll", checkScrollability, { passive: true });
    const ro = new ResizeObserver(checkScrollability);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScrollability);
      ro.disconnect();
    };
  }, [checkScrollability]);
  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragScrollLeft.current - (x - dragStartX.current);
  };
  const handleMouseUp = () => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = false;
    el.style.cursor = "grab";
  };
  return (
    <div className={cn("flex w-full items-center gap-1", className)}>
      <AnimatePresence initial={false}>
        {canScrollLeft ? (
          <motion.div
            key="scroll-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fastTransition}
          >
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => scrollBy(-200)}
              className={cn(
                flatInteractiveClass,
                "h-7 w-7 shrink-0 rounded-full",
              )}
            >
              <IconChevronLeft size={14} />
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto select-none cursor-grab [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex w-max flex-nowrap items-center gap-2 px-1">
          {children}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {canScrollRight ? (
          <motion.div
            key="scroll-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fastTransition}
          >
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => scrollBy(200)}
              className={cn(
                flatInteractiveClass,
                "h-7 w-7 shrink-0 rounded-full",
              )}
            >
              <IconChevronRight size={14} />
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
export const Suggestions = ({
  className,
  children,
  orientation = "horizontal",
}: SuggestionsProps) => {
  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-stretch gap-2",
          "[&_button]:h-auto [&_button]:w-full [&_button]:justify-start [&_button]:rounded-lg [&_button]:whitespace-normal [&_button]:text-left [&_button]:py-2",
          className,
        )}
      >
        {children}
      </div>
    );
  }
  return (
    <HorizontalSuggestions className={className}>
      {children}
    </HorizontalSuggestions>
  );
};
export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};
export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion);
  };
  return (
    <Button
      className={cn(
        "h-auto cursor-pointer rounded-full bg-surface-secondary px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-tertiary hover:text-foreground",
        className,
      )}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
