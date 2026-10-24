import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { animate } from "motion";
import { cn } from "../../src/utils/cn";
import { rubberband } from "../../src/utils/gesture";

/** Opt-in resizable sidebar panel. Widths are panel px, rail excluded. */
export type SidebarResizeOptions = {
  /** `localStorage` key for the panel width (a JSON number). */
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** Handle `aria-label`. Default `"Resize sidebar"`. */
  label?: string;
};

type WidthUpdate = number | ((width: number) => number);
type Animation = ReturnType<typeof animate>;

type SidebarResizeState = {
  width: number;
  setWidth: (update: WidthUpdate) => void;
  isResizing: boolean;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  label: string;
  /** Latest width, readable between renders (pointer moves can outpace them). */
  currentWidth: () => number;
  stopAnimation: () => void;
  startResizing: () => void;
  settleToClamp: (velocity: number) => void;
};

const SidebarResizeContext = createContext<SidebarResizeState | null>(null);
export const SidebarResizeProvider = SidebarResizeContext.Provider;

const KEYBOARD_STEP = 16;

type Sample = { x: number; t: number };

function releaseVelocity(samples: Sample[]): number {
  if (samples.length < 2) return 0;
  const newest = samples[samples.length - 1];
  const oldest = samples[0];
  if (!newest || !oldest) return 0;
  const dt = newest.t - oldest.t;
  if (dt <= 0) return 0;
  return ((newest.x - oldest.x) / dt) * 1000;
}

function readStoredWidth(storageKey: string | undefined): number | null {
  if (storageKey === undefined || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null || raw.trim() === "") return null;
    // A JSON number parses the same with Number(); anything else is NaN.
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredWidth(storageKey: string, width: number) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(width));
  } catch {
    // Storage full or blocked: keep the in-memory width.
  }
}

const subscribeNever = () => () => {};
const serverSnapshot = () => null;

/**
 * Width and resize state for `AppShell`. Returns `null` without options. The
 * stored width is read through `useSyncExternalStore` (the server snapshot is
 * `null`, so SSR and hydration render `defaultWidth`); later writes go to
 * local state and storage.
 */
export function useSidebarResizeState(
  options: SidebarResizeOptions | undefined,
): SidebarResizeState | null {
  const storageKey = options?.storageKey;
  const stored = useSyncExternalStore(subscribeNever, () => readStoredWidth(storageKey), serverSnapshot);
  const [override, setOverride] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef<number | null>(null);
  const animRef = useRef<Animation | null>(null);

  useEffect(() => () => animRef.current?.stop(), []);

  if (!options) return null;
  const { defaultWidth, minWidth, maxWidth } = options;
  const clampWidth = (width: number) => Math.min(maxWidth, Math.max(minWidth, width));
  const width = override ?? (stored === null ? defaultWidth : clampWidth(stored));
  const currentWidth = () => widthRef.current ?? width;

  const setWidth = (update: WidthUpdate) => {
    const next = typeof update === "function" ? update(currentWidth()) : update;
    widthRef.current = next;
    setOverride(next);
    writeStoredWidth(options.storageKey, next);
  };

  const stopAnimation = () => animRef.current?.stop();

  const settleToClamp = (velocity: number) => {
    const from = currentWidth();
    const to = clampWidth(from);
    setIsResizing(false);
    if (from === to) return;
    animRef.current?.stop();
    animRef.current = animate(from, to, {
      type: "spring",
      bounce: 0.2,
      duration: 0.35,
      velocity,
      onUpdate: (value) => setWidth(value),
    });
  };

  return {
    width,
    setWidth,
    isResizing,
    minWidth,
    maxWidth,
    defaultWidth,
    label: options.label ?? "Resize sidebar",
    currentWidth,
    stopAnimation,
    startResizing: () => setIsResizing(true),
    settleToClamp,
  };
}

export function useSidebarResizeContext(): SidebarResizeState | null {
  return useContext(SidebarResizeContext);
}

export type AppShellResize = {
  /** Panel width in px (rail excluded). Can sit past the bounds mid-drag. */
  width: number;
  setWidth: (update: WidthUpdate) => void;
  isResizing: boolean;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
};

/** Panel width and resize state of the nearest resizable `AppShell`, or `null`. */
export function useAppShellResize(): AppShellResize | null {
  const resize = useContext(SidebarResizeContext);
  if (!resize) return null;
  const { width, setWidth, isResizing, minWidth, maxWidth, defaultWidth } = resize;
  return { width, setWidth, isResizing, minWidth, maxWidth, defaultWidth };
}

export type SidebarResizeHandleProps = { className?: string };

/**
 * Vertical separator on the right edge of its positioned parent. Drag past the
 * bounds rubber-bands and springs back on release; arrow keys step 16px;
 * double-click resets. Renders nothing outside a resizable `AppShell`.
 */
export function SidebarResizeHandle({ className }: SidebarResizeHandleProps) {
  const resize = useContext(SidebarResizeContext);
  const samplesRef = useRef<Sample[]>([]);
  if (!resize) return null;
  const { width, setWidth, isResizing, minWidth, maxWidth, defaultWidth } = resize;
  const clampWidth = (value: number) => Math.min(maxWidth, Math.max(minWidth, value));
  const softWidth = (value: number) => {
    if (value < minWidth) return minWidth - rubberband(minWidth - value, minWidth);
    if (value > maxWidth) return maxWidth + rubberband(value - maxWidth, maxWidth);
    return value;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resize.stopAnimation();
    event.currentTarget.setPointerCapture(event.pointerId);
    samplesRef.current = [{ x: resize.currentWidth(), t: performance.now() }];
    resize.startResizing();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    const next = softWidth(resize.currentWidth() + event.movementX);
    const now = performance.now();
    const samples = samplesRef.current;
    samples.push({ x: next, t: now });
    while (samples.length > 5 || now - (samples[0]?.t ?? now) > 80) samples.shift();
    setWidth(next);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    resize.settleToClamp(releaseVelocity(samplesRef.current));
    samplesRef.current = [];
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    resize.settleToClamp(0);
    samplesRef.current = [];
  };

  const handleDoubleClick = () => {
    resize.stopAnimation();
    setWidth(defaultWidth);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    resize.stopAnimation();
    const step = event.key === "ArrowLeft" ? -KEYBOARD_STEP : KEYBOARD_STEP;
    setWidth((current) => clampWidth(current + step));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={resize.label}
      aria-valuenow={clampWidth(width)}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      className={cn(
        "absolute inset-y-0 right-0 z-50 h-full w-1.5 cursor-col-resize outline-hidden transition-[background-color] hover:bg-default focus-visible:bg-default",
        isResizing && "bg-default",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    />
  );
}
