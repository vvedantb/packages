import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { tokenTransition } from "../motion/presets";
import { useCn } from "./ui-config";

/**
 * The entrance and exit for a live count badge (unread dots, a drafts pill, a
 * running count). The number usually changes while the user looks elsewhere,
 * so the badge says *that it changed*: it pops from `scale(0.5)` on an
 * emphasized curve, and pops again on every change because `label` is the
 * key (2 → 3 remounts). Exit is a plain shrink on `tokenTransition.fast`.
 *
 * `mode="popLayout"` takes the leaving badge out of flow, so 9 → 10 does not
 * push its neighbours sideways during the crossfade. Only the motion lives
 * here; the caller owns the look through `className`. Uses `m`, so the app
 * must render it inside `LazyMotion`.
 */
export function CountPop({
  label,
  className,
  children,
}: {
  /** Rendered content, and the remount key. `null` renders nothing. */
  label: string | null;
  className?: string;
  /** Defaults to `label`; pass children for a badge with more than a number. */
  children?: ReactNode;
}) {
  return (
    <AnimatePresence mode="popLayout">
      {label === null ? null : (
        <m.span
          key={label}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transition: tokenTransition.fast }}
          transition={{ ...tokenTransition.base, ease: [0.2, 0.8, 0.2, 1] }}
          className={className}
        >
          {children ?? label}
        </m.span>
      )}
    </AnimatePresence>
  );
}

/** A count badge label: `null` for nothing to show, `"99+"` above 99. */
export function countLabel(count: number | undefined): string | null {
  if (count === undefined || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

/**
 * The unread mark for rows, cards and tabs: a `bg-primary` dot, so it follows
 * the theme accent. `CountPop` gives it the pop-in and the exit.
 */
export function UnreadDot({ show, className }: { show: boolean; className?: string }) {
  const cn = useCn();
  return (
    <CountPop
      label={show ? "unread" : null}
      className={cn("size-1.5 shrink-0 rounded-full bg-primary", className)}
    >
      <span className="sr-only">Unread</span>
    </CountPop>
  );
}

/**
 * Shape and placement of a count badge hung off a tile's bottom-right corner.
 * Put the tile in a `relative` box; add one tone class (e.g. a live colour).
 */
export const CORNER_BADGE_CLASS =
  "absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none";

/** An unread count on a tile's corner: `CountPop` in the primary tone, "99+" above 99. */
export function UnreadCornerBadge({ count, className }: { count: number | undefined; className?: string }) {
  const cn = useCn();
  return (
    <CountPop
      label={countLabel(count)}
      className={cn(CORNER_BADGE_CLASS, "bg-primary text-primary-foreground", className)}
    />
  );
}
