import { useEffect, useRef, type ReactNode } from "react";
import { useCn } from "./ui-config";

/** Pixels per second the revealed text travels: constant speed, so long labels do not whip by. */
const MARQUEE_SPEED_PX_PER_S = 60;
/** Clamp the scroll duration so very short and very long overflows both stay readable. */
const MIN_DURATION_S = 0.5;
const MAX_DURATION_S = 5;

interface MarqueeOnHoverProps {
  children: ReactNode;
  className?: string;
}

/**
 * Single-line label that scrolls its hidden tail into view on hover ("reveal
 * and hold") and shows a plain ellipsis the rest of the time. It moves only
 * when the text overflows. Needs `@vvedantb/ui/tokens/css/marquee.css`.
 *
 * Two spans: the outer `mq-host` clips and the inner `mq-inner` translates.
 * One element cannot both ellipsis-clip itself and translate its own overflow
 * into view. Hover is pure CSS; this component only measures the overflow on
 * layout changes and writes it to custom properties, so hovering never
 * re-renders. Text styles go on `className` (the host) and are inherited; drop
 * any `truncate` / `line-clamp` class from the caller.
 */
export function MarqueeOnHover({ children, className }: MarqueeOnHoverProps) {
  const cn = useCn();
  const hostRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  // Re-measure after a content change, a host resize or the web font swap,
  // since each changes how much (if at all) the text overflows.
  useEffect(() => {
    const host = hostRef.current;
    const inner = innerRef.current;
    if (!host || !inner) return;

    let cancelled = false;
    let raf = 0;
    const recompute = () => {
      if (cancelled) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const shift = Math.max(0, inner.scrollWidth - host.clientWidth);
        const overflows = shift > 1; // 1px guard against sub-pixel rounding jitter
        host.dataset.mqOverflow = overflows ? "true" : "false";
        // Native tooltip is the touch / long-hover fallback, only when truncated.
        host.title = overflows ? (inner.textContent ?? "") : "";
        if (overflows) {
          const duration = Math.min(
            MAX_DURATION_S,
            Math.max(MIN_DURATION_S, shift / MARQUEE_SPEED_PX_PER_S),
          );
          host.style.setProperty("--mq-shift", `${shift}px`);
          host.style.setProperty("--mq-dur", `${duration}s`);
        }
      });
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(host);
    void document.fonts.ready.then(() => recompute());

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [children]);

  return (
    <span ref={hostRef} className={cn("mq-host", className)}>
      <span ref={innerRef} className="mq-inner">
        {children}
      </span>
    </span>
  );
}
