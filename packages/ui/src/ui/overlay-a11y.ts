import * as React from "react";

/** Phones, plus short landscape viewports such as 844×390. */
export const COMPACT_OVERLAY_QUERY = "(max-width: 639px), (max-height: 500px)";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useCompactOverlay(): boolean {
  const [compact, setCompact] = React.useState(false);

  React.useLayoutEffect(() => {
    const mql = window.matchMedia(COMPACT_OVERLAY_QUERY);
    const sync = () => setCompact(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return compact;
}

/** Radix dropdowns leave `pointer-events: none` on body when a dialog opens. */
export function restoreBodyPointerEvents(): void {
  if (typeof document === "undefined") return;
  if (document.body.style.pointerEvents === "none") {
    document.body.style.removeProperty("pointer-events");
  }
}

/**
 * Clears the body pointer-events and scroll lock a closing modal menu can leave
 * behind. Keeps the scroll lock while any dialog or alert dialog is still open.
 */
export function restoreModalScrollLock(): void {
  if (typeof document === "undefined") return;
  document.body.style.removeProperty("pointer-events");
  if (
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    )
  ) {
    return;
  }
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
  document.documentElement.style.removeProperty("overflow");
}

export function connectBodyPointerEventsFix(): () => void {
  restoreBodyPointerEvents();
  const observer = new MutationObserver(() => restoreBodyPointerEvents());
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style"],
  });
  const t0 = window.setTimeout(restoreBodyPointerEvents, 0);
  const t1 = window.setTimeout(restoreBodyPointerEvents, 50);
  return () => {
    observer.disconnect();
    window.clearTimeout(t0);
    window.clearTimeout(t1);
  };
}

export function connectOverlayViewport(el: HTMLElement): () => void {
  const apply = () => {
    const vv = window.visualViewport;
    const height = vv?.height ?? window.innerHeight;
    const offsetTop = vv?.offsetTop ?? 0;
    const bottom = Math.max(0, window.innerHeight - height - offsetTop);
    el.style.setProperty("--overlay-vv-height", `${height}px`);
    el.style.setProperty("--overlay-vv-bottom", `${bottom}px`);
    if (el.getAttribute("data-compact") === "true") {
      el.style.height = `${Math.min(el.scrollHeight, height)}px`;
    } else {
      el.style.removeProperty("height");
    }
  };

  apply();
  const vv = window.visualViewport;
  vv?.addEventListener("resize", apply);
  vv?.addEventListener("scroll", apply);
  window.addEventListener("resize", apply);
  return () => {
    vv?.removeEventListener("resize", apply);
    vv?.removeEventListener("scroll", apply);
    window.removeEventListener("resize", apply);
    el.style.removeProperty("--overlay-vv-height");
    el.style.removeProperty("--overlay-vv-bottom");
  };
}

function isEditable(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function connectKeyboardScroll(root: HTMLElement): () => void {
  const scrollFocused = () => {
    const run = () => {
      const target = document.activeElement;
      if (!isEditable(target) || !root.contains(target)) return;
      target.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  };

  const onFocusIn = (event: FocusEvent) => {
    if (!isEditable(event.target)) return;
    requestAnimationFrame(scrollFocused);
  };

  root.addEventListener("focusin", onFocusIn);
  window.visualViewport?.addEventListener("resize", scrollFocused);
  window.addEventListener("resize", scrollFocused);
  return () => {
    root.removeEventListener("focusin", onFocusIn);
    window.visualViewport?.removeEventListener("resize", scrollFocused);
    window.removeEventListener("resize", scrollFocused);
  };
}

export function treeHasDialogDescription(
  node: React.ReactNode,
  descriptionType: React.ElementType,
): boolean {
  return React.Children.toArray(node).some((child) => {
    if (!React.isValidElement(child)) return false;
    const type = child.type;
    if (type === descriptionType) return true;
    const displayName =
      typeof type === "object" && type !== null
        ? (type as { displayName?: string }).displayName
        : undefined;
    if (displayName === "DialogDescription") return true;
    const props = child.props as { children?: React.ReactNode };
    return treeHasDialogDescription(props.children, descriptionType);
  });
}
