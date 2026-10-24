import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { m } from "motion/react";
import { motionFast } from "./motion";
import type { ComposerSlashPlacement } from "./composerSlashPosition";
import type { ComposerSlashItem } from "./composerSlashItems";
import { filterAndGroupSlashItems } from "./composerSlashItems";
import { optionId } from "./composerSlashOptionId";
import { ComposerSlashRow } from "./ComposerSlashRow";

interface ComposerSlashMenuProps {
  listboxId: string;
  placement: ComposerSlashPlacement;
  items: ComposerSlashItem[];
  query: string;
  selectedIndex: number;
  onHoverIndex: (index: number) => void;
  onSelectItem: (item: ComposerSlashItem) => void;
  /** Wrap the row, for example in a hover card. Return `row` to keep the default. */
  renderItem?: (item: ComposerSlashItem, row: ReactNode) => ReactNode;
}

export function ComposerSlashMenu({
  listboxId,
  placement,
  items,
  query,
  selectedIndex,
  onHoverIndex,
  onSelectItem,
  renderItem,
}: ComposerSlashMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const groups = filterAndGroupSlashItems(items, query);
  const flatItems = groups.flatMap((group) => group.items);
  const indexById = new Map(flatItems.map((item, index) => [item.id, index]));
  const isAbove = placement.placement === "above";

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector<HTMLElement>(
      '[data-slash-picker-item][data-selected="true"]',
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, flatItems.length]);

  return (
    <div
      className="fixed z-50"
      style={{
        left: placement.left,
        top: placement.top,
        width: placement.width,
        transform: isAbove ? "translateY(-100%)" : undefined,
      }}
    >
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={motionFast}
        style={{ maxHeight: placement.maxHeight }}
        className={
          "flex flex-col overflow-hidden rounded-surface " +
          "bg-popover/95 text-popover-foreground backdrop-blur-md smooth-shadow-ring-lg " +
          (isAbove ? "origin-bottom" : "origin-top")
        }
      >
        {flatItems.length > 0 ? (
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Commands"
            className="scrollbar scroll-fade min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
          >
            {groups.map((group) => (
              <div key={group.group}>
                <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const index = indexById.get(item.id);
                  if (index === undefined) return null;
                  const row = (
                    <ComposerSlashRow
                      label={item.label}
                      description={item.description}
                      icon={item.icon}
                      badge={item.badge}
                      active={item.active}
                    />
                  );
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      id={optionId(listboxId, item.id)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-slash-picker-item
                      data-selected={isSelected ? "true" : "false"}
                      onMouseEnter={() => onHoverIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onSelectItem(item);
                      }}
                      className={
                        "mx-1 flex w-[calc(100%-0.5rem)] min-w-0 items-center rounded-menu-item px-2 py-1.5 text-left text-sm max-sm:py-2.5 " +
                        "transition-[background-color] active:scale-[0.99] active:duration-100 active:ease-out " +
                        (isSelected
                          ? "bg-primary/15 font-medium text-foreground dark:bg-primary/25"
                          : "text-foreground/90 hover:bg-muted") // check-tokens-allow: muted
                      }
                    >
                      {renderItem ? (
                        renderItem(item, row)
                      ) : (
                        row
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            No matches.
          </div>
        )}
      </m.div>
    </div>
  );
}
