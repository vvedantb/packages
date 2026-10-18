import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { ComposerSlashItem } from "./composerSlashItems";
import { filterAndGroupSlashItems } from "./composerSlashItems";
import { optionId } from "./composerSlashOptionId";
import {
  computePanelPopupPlacement,
  viewportSize,
  type ComposerSlashPlacement,
} from "./composerSlashPosition";
import {
  findSlashTrigger,
  stripSlashTrigger,
  type SlashTrigger,
} from "./composerSlashTrigger";

export function useComposerSlashMenu({
  value,
  onValueChange,
  items,
  textareaRef,
  onSelect,
  enabled = true,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: ComposerSlashItem[];
  textareaRef: RefObject<HTMLElement | null>;
  onSelect: (item: ComposerSlashItem) => void;
  /** When false the menu never opens. */
  enabled?: boolean;
}) {
  const listboxId = useId();
  const trigger = enabled ? findSlashTrigger(value) : null;
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [placement, setPlacement] = useState<ComposerSlashPlacement | null>(
    null,
  );

  useEffect(() => {
    const next = enabled ? findSlashTrigger(value) : null;
    if (next === null) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setSelectedIndex(0);
  }, [value, enabled]);

  const showPopup = open && trigger !== null;
  const groups = filterAndGroupSlashItems(items, trigger?.query ?? "");
  const visibleItems = groups.flatMap((group) => group.items);
  const activeItem = showPopup ? visibleItems[selectedIndex] : undefined;

  useEffect(() => {
    if (!showPopup) {
      setPlacement(null);
      return;
    }
    let attached = false;
    const update = () => {
      if (document.visibilityState !== "visible") return;
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const panelAnchor = el.closest("[data-composer-slash-anchor]");
        const rect = panelAnchor
          ? panelAnchor.getBoundingClientRect()
          : el.getBoundingClientRect();
        setPlacement(computePanelPopupPlacement(rect, viewportSize()));
      });
    };
    const syncLayoutListeners = () => {
      const shouldAttach = document.visibilityState === "visible";
      if (shouldAttach && !attached) {
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        attached = true;
      } else if (!shouldAttach && attached) {
        window.removeEventListener("scroll", update, true);
        window.removeEventListener("resize", update);
        attached = false;
      }
    };
    const onVisibilityChange = () => {
      syncLayoutListeners();
      update();
    };
    update();
    syncLayoutListeners();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (attached) {
        window.removeEventListener("scroll", update, true);
        window.removeEventListener("resize", update);
      }
    };
  }, [showPopup, trigger?.query, trigger?.startIndex, value, textareaRef]);

  const close = () => {
    setOpen(false);
    setSelectedIndex(0);
  };

  const applyItem = (item: ComposerSlashItem, current: SlashTrigger) => {
    onValueChange(stripSlashTrigger(value, current.startIndex, current.query));
    close();
    onSelect(item);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const insertActiveItem = () => {
    if (trigger === null) return;
    const item = visibleItems[selectedIndex];
    if (item) applyItem(item, trigger);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    if (!showPopup) return false;
    if (visibleItems.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev >= visibleItems.length - 1 ? 0 : prev + 1,
        );
        return true;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? visibleItems.length - 1 : prev - 1,
        );
        return true;
      }
      if (event.key === "Enter") {
        if (event.nativeEvent.isComposing) return true;
        event.preventDefault();
        event.stopPropagation();
        insertActiveItem();
        return true;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        insertActiveItem();
        return true;
      }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      textareaRef.current?.focus();
      return true;
    }
    return false;
  };

  const onBlur = () => {
    if (showPopup) close();
  };

  return {
    showPopup,
    trigger,
    listboxId,
    selectedIndex,
    setSelectedIndex,
    placement,
    visibleItems,
    onKeyDown,
    onBlur,
    onSelectItem: (item: ComposerSlashItem) => {
      if (trigger === null) return;
      applyItem(item, trigger);
    },
    comboboxProps: {
      role: "combobox",
      "aria-multiline": true,
      "aria-haspopup": "listbox",
      "aria-autocomplete": "list",
      "aria-expanded": showPopup,
      "aria-controls": showPopup ? listboxId : undefined,
      "aria-activedescendant":
        activeItem && showPopup
          ? optionId(listboxId, activeItem.id)
          : undefined,
    } satisfies {
      role: "combobox";
      "aria-multiline": boolean;
      "aria-haspopup": "listbox";
      "aria-autocomplete": "list";
      "aria-expanded": boolean;
      "aria-controls": string | undefined;
      "aria-activedescendant": string | undefined;
    },
  };
}
