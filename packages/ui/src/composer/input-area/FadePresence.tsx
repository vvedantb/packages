import type { ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { motionFast } from "./motion";

export type FadePresenceProps = {
  show: boolean;
  children: ReactNode;
  className?: string;
};

/** Fades children in and out as `show` changes. Does not animate on first mount. */
export function FadePresence({ show, children, className }: FadePresenceProps) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <m.div
          key="fade-presence"
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={motionFast}
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
