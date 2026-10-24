// transitions.dev tabs sliding, see 16, tabs, sliding.md

function findActiveTab(list: HTMLElement): HTMLElement | null {
  const tabs = list.querySelectorAll<HTMLElement>(".t-tab");
  for (const tab of tabs) {
    if (
      tab.getAttribute("aria-selected") === "true" ||
      tab.getAttribute("data-state") === "active"
    ) {
      return tab;
    }
  }
  if (tabs.length === 0) {
    return null;
  }
  return tabs[0] ?? null;
}

// `xy`: both axes on transform (top pinned to 0), so a column list slides the
// same way a row does; `top` is a layout property and does not tween.
function moveTabsPillXY(
  pill: HTMLElement,
  tab: HTMLElement,
  animate: boolean,
): void {
  const transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
  const width = `${tab.offsetWidth}px`;
  const height = `${tab.offsetHeight}px`;
  const previousTransition = pill.style.transition;
  if (!animate) {
    pill.style.transition = "none";
  }
  pill.style.top = "0px";
  pill.style.transform = transform;
  pill.style.width = width;
  pill.style.height = height;
  if (!animate) {
    void pill.offsetWidth;
    pill.style.transition = previousTransition;
  }
}

function moveTabsPill(
  pill: HTMLElement,
  tab: HTMLElement,
  animate: boolean,
): void {
  const left = tab.offsetLeft;
  const width = tab.offsetWidth;
  const top = tab.offsetTop;
  const height = tab.offsetHeight;

  if (!animate) {
    const previousTransition = pill.style.transition;
    pill.style.transition = "none";
    pill.style.transform = `translateX(${left}px)`;
    pill.style.width = `${width}px`;
    pill.style.top = `${top}px`;
    pill.style.height = `${height}px`;
    void pill.offsetWidth;
    pill.style.transition = previousTransition;
    return;
  }

  pill.style.transform = `translateX(${left}px)`;
  pill.style.width = `${width}px`;
  pill.style.top = `${top}px`;
  pill.style.height = `${height}px`;
}

export type TabsPillMotion = "x" | "xy";

export function syncTabsPill(
  list: HTMLElement,
  pill: HTMLElement,
  animate: boolean,
  motion: TabsPillMotion = "x",
): void {
  const tab = findActiveTab(list);
  if (!tab) {
    return;
  }
  if (motion === "xy") {
    moveTabsPillXY(pill, tab, animate);
  } else {
    moveTabsPill(pill, tab, animate);
  }
}
