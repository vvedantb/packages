import { m } from "motion/react";
import { springTransition } from "../motion/presets";

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type Shape = readonly [Segment, Segment, Segment];

// Both shapes use the same three lines, so the arrow's own strokes move into
// the queue bars instead of one icon fading out and another fading in.
// Arrow points match Tabler's `IconArrowUp` on its 24px grid.
const ARROW: Shape = [
  { x1: 6, y1: 11, x2: 12, y2: 5 },
  { x1: 12, y1: 5, x2: 12, y2: 19 },
  { x1: 18, y1: 11, x2: 12, y2: 5 },
];

const QUEUE: Shape = [
  { x1: 5, y1: 7, x2: 19, y2: 7 },
  { x1: 5, y1: 12, x2: 19, y2: 12 },
  { x1: 19, y1: 17, x2: 5, y2: 17 },
];

/**
 * A send arrow that turns into a stack of bars when `queued`: while the agent
 * works, a send joins the queue. Line N of the arrow becomes line N of the
 * stack. Uses `m`, so the app must render it inside `LazyMotion`.
 */
export function SendQueueIcon({ queued, className = "size-4" }: { queued: boolean; className?: string }) {
  const shape = queued ? QUEUE : ARROW;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      {shape.map((segment, index) => (
        <m.line
          key={index}
          initial={false}
          animate={{ x1: segment.x1, y1: segment.y1, x2: segment.x2, y2: segment.y2 }}
          transition={springTransition}
        />
      ))}
    </svg>
  );
}
