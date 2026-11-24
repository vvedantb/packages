/** transitions.dev input clear with dissolve — see 13-input-clear-dissolve.md */

// Times come back in ms. CSS minifiers rewrite `1000ms` as `1s`, so a value
// in seconds is converted rather than read as 1.
export function readCssNumber(
  root: HTMLElement,
  name: string,
  fallback: number,
): number {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return /\ds$/.test(raw) ? parsed * 1000 : parsed;
}

export function readCssEase(root: HTMLElement, name: string): (t: number) => number {
  const raw = getComputedStyle(root).getPropertyValue(name);
  const match = raw.match(
    /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/,
  );
  if (!match) {
    return (t) => t;
  }
  const x1 = parseFloat(match[1] ?? "0");
  const y1 = parseFloat(match[2] ?? "0");
  const x2 = parseFloat(match[3] ?? "0");
  const y2 = parseFloat(match[4] ?? "0");
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return (t) => {
    if (t <= 0) {
      return 0;
    }
    if (t >= 1) {
      return 1;
    }
    let sample = t;
    for (let i = 0; i < 8; i += 1) {
      const dx = ((ax * sample + bx) * sample + cx) * sample - t;
      const derivative = (3 * ax * sample + 2 * bx) * sample + cx;
      if (Math.abs(dx) < 1e-6 || derivative === 0) {
        break;
      }
      sample -= dx / derivative;
    }
    return ((ay * sample + by) * sample + cy) * sample;
  };
}

export interface ClearDissolveElements {
  wrap: HTMLElement;
  input: HTMLInputElement;
  mirror: HTMLElement;
  placeholderLayer: HTMLElement;
}

function resetLayerStyles(
  mirror: HTMLElement,
  placeholderLayer: HTMLElement,
): void {
  mirror.style.cssText = "";
  placeholderLayer.style.cssText = "";
}

export function runClearInputDissolve(
  elements: ClearDissolveElements,
  onValueClear: () => void,
  onDone: () => void,
): void {
  const { wrap, input, mirror, placeholderLayer } = elements;
  const root = document.documentElement;
  const text = input.value;
  if (text.length === 0) {
    return;
  }

  const keepFocus = document.activeElement === input;
  mirror.textContent = text.replace(/ /g, "\u00a0");

  const total = readCssNumber(root, "--clear-dur", 400);
  const outDur = readCssNumber(root, "--clear-out-dur", 400);
  const inDur = readCssNumber(root, "--clear-in-dur", 400);
  const outFly = readCssNumber(root, "--clear-out-fly", 12);
  const inFly = readCssNumber(root, "--clear-in-fly", 12);
  const easeOut = readCssEase(root, "--clear-out-ease");
  const easeIn = readCssEase(root, "--clear-in-ease");

  onValueClear();
  wrap.classList.remove("has-value");
  wrap.classList.add("is-clearing");
  placeholderLayer.style.transform = `translateY(-${inFly}px)`;
  placeholderLayer.style.opacity = "0.9";
  placeholderLayer.style.filter = "none";
  mirror.style.filter = "none";

  const startedAt = performance.now();

  function tick(now: number): void {
    const elapsed = now - startedAt;
    const outProgress = easeOut(Math.min(1, elapsed / outDur));
    mirror.style.transform = `translateY(${(outProgress * outFly).toFixed(1)}px)`;
    mirror.style.opacity = (1 - outProgress).toFixed(3);

    const inProgress = easeIn(Math.min(1, elapsed / inDur));
    placeholderLayer.style.transform = `translateY(${(-inFly + inProgress * inFly).toFixed(1)}px)`;
    placeholderLayer.style.opacity = (0.9 + inProgress * 0.1).toFixed(3);

    if (elapsed < total) {
      requestAnimationFrame(tick);
      return;
    }

    wrap.classList.remove("is-clearing");
    resetLayerStyles(mirror, placeholderLayer);
    mirror.textContent = "";
    onDone();
    if (keepFocus) {
      requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
      });
    }
  }

  requestAnimationFrame(tick);
}
