import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "./cn.js";

export type PillTabItem = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export type PillTabsProps = {
  tabs: PillTabItem[];
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

const tabBase =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3.5 py-1 text-sm font-medium transition-[color,background-color,border-color] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const tabIdle = "text-muted hover:bg-default/50 hover:text-foreground";
const tabSelected = "bg-default text-foreground";

export function PillTabs({ tabs, value, onValueChange, className }: PillTabsProps) {
  // Arrow keys, Home and End move focus and selection (WAI-ARIA tabs pattern).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const count = tabs.length;
    if (count === 0) return;
    const current = Math.max(
      0,
      tabs.findIndex((tab) => tab.value === value),
    );
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (current + 1) % count;
        break;
      case "ArrowLeft":
        next = (current - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons[next]?.focus();
    onValueChange?.(tabs[next]!.value);
  }

  const hasSelection = tabs.some((tab) => tab.value === value);

  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-1.5", className)}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        const focusable = selected || (!hasSelection && index === 0);
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={focusable ? 0 : -1}
            className={cn(tabBase, selected ? tabSelected : tabIdle)}
            onClick={() => onValueChange?.(tab.value)}
          >
            {tab.icon ? (
              <span aria-hidden="true" className="inline-flex shrink-0">
                {tab.icon}
              </span>
            ) : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
