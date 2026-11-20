import { prefersReducedMotion } from "./overlay-a11y";

const closeTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/*
 * Grow from the trigger (macOS-style): a modal opened by a press grows out of
 * the pressed point and shrinks back into it on close. Opened from the
 * keyboard, it grows out of the focused control. With neither (a shortcut, an
 * async open), it keeps the centred `--modal-scale` zoom.
 */
const TRIGGER_SCALE = 0.4;
/** A press older than this did not open the modal (it was an async open). */
const PRESS_WINDOW_MS = 500;
let lastPress: { x: number; y: number; at: number } | null = null;

// From module load, not the first modal: the press that opens the first
// modal comes before any modal connects.
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (event) => {
      lastPress = { x: event.clientX, y: event.clientY, at: performance.now() };
    },
    true,
  );
}

function triggerPoint(el: HTMLElement): { x: number; y: number } | null {
  const press = lastPress;
  lastPress = null;
  if (press && performance.now() - press.at < PRESS_WINDOW_MS) return press;
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    !el.contains(active)
  ) {
    const r = active.getBoundingClientRect();
    if (r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

/**
 * Points the surface's transform origin at the trigger and widens its zoom.
 * Skips instant surfaces (`--modal-scale: 1`, the command palette). Measured
 * from the box centre, which a centred scale does not move.
 */
function aimAtTrigger(el: HTMLElement): void {
  if (getComputedStyle(el).getPropertyValue("--modal-scale").trim() === "1") {
    return;
  }
  const point = triggerPoint(el);
  // No layout (jsdom, a hidden host): nothing to aim from.
  if (point === null || el.offsetWidth === 0) return;
  const r = el.getBoundingClientRect();
  const left = r.left + r.width / 2 - el.offsetWidth / 2;
  const top = r.top + r.height / 2 - el.offsetHeight / 2;
  // Measuring fixed the 0.96 start as the before-change style, so jump to
  // the trigger start without a transition, or it would tween there first.
  el.style.transition = "none";
  el.style.transformOrigin = `${point.x - left}px ${point.y - top}px`;
  el.style.setProperty("--modal-scale", String(TRIGGER_SCALE));
  el.style.setProperty("--modal-scale-close", String(TRIGGER_SCALE));
  void el.offsetWidth;
  el.style.transition = "";
}

function readModalCloseMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--modal-close-dur",
  );
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 150;
}

function clearCloseTimer(el: HTMLElement): void {
  const timer = closeTimers.get(el);
  if (timer !== undefined) {
    clearTimeout(timer);
    closeTimers.delete(el);
  }
}

// open: scales up from, modal, scale clears any in, flight close cleanup
function openModalSurface(el: HTMLElement): void {
  clearCloseTimer(el);
  el.classList.remove("is-closing");
  el.classList.add("is-open");
}

// close: swap to is, closing, remove after, modal, close, dur
function closeModalSurface(el: HTMLElement): void {
  clearCloseTimer(el);
  el.classList.remove("is-open");
  if (prefersReducedMotion()) {
    el.classList.remove("is-closing");
    return;
  }
  el.classList.add("is-closing");
  const closeMs = readModalCloseMs();
  const timer = setTimeout(() => {
    el.classList.remove("is-closing");
    closeTimers.delete(el);
  }, closeMs);
  closeTimers.set(el, timer);
}

// first paint entrance, start at resting scale, then open on next frame
function primeModalSurface(el: HTMLElement): void {
  clearCloseTimer(el);
  el.classList.remove("is-open", "is-closing");
  if (prefersReducedMotion()) {
    openModalSurface(el);
    return;
  }
  aimAtTrigger(el);
  requestAnimationFrame(() => {
    openModalSurface(el);
  });
}

// sync is, open / is, closing with radix data, state on the same node
function syncModalSurfaceFromDataState(el: HTMLElement): void {
  const state = el.getAttribute("data-state");
  if (state === "open") {
    if (!el.classList.contains("is-open")) {
      primeModalSurface(el);
    } else {
      clearCloseTimer(el);
      el.classList.remove("is-closing");
    }
    return;
  }
  if (state === "closed" && el.classList.contains("is-open")) {
    closeModalSurface(el);
  }
}

function disconnectModalSurface(el: HTMLElement): void {
  clearCloseTimer(el);
}

// wire radix data, state → is, open / is, closing on the dialog surface
// call from the content ref callback so portal, mounted nodes are never missed
export function connectModalSurface(el: HTMLElement): () => void {
  // A content re-render can re-run the ref (a new `ref` prop): a surface
  // that is already open stays put, or it replayed its entrance mid-view.
  if (
    el.getAttribute("data-state") === "open" &&
    !el.classList.contains("is-open")
  ) {
    primeModalSurface(el);
  }

  const observer = new MutationObserver(() => {
    syncModalSurfaceFromDataState(el);
  });
  observer.observe(el, { attributes: true, attributeFilter: ["data-state"] });

  return () => {
    observer.disconnect();
    disconnectModalSurface(el);
  };
}
