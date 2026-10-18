import type { ReactNode } from "react";
import { AnimatePresence, domAnimation, LazyMotion, m, type Variants } from "motion/react";
import { motionFast } from "./motion";

export type FadePresenceProps = {
  show: boolean;
  children: ReactNode;
  className?: string;
  /**
   * Optional `hidden` / `show` / `exit` variants, for example `fadeUpSpring`.
   * Omitted, the content fades opacity only.
   */
  variants?: Variants;
};

/** Fades children in and out as `show` changes. Does not animate on first mount. Brings its own `LazyMotion`, so `m` components animate without an app provider. */
export function FadePresence({ show, children, className, variants }: FadePresenceProps) {
  return (
    <LazyMotion features={domAnimation}>
    <AnimatePresence initial={false}>
      {show ? (
        variants ? (
          <m.div
            key="fade-presence"
            className={className}
            initial="hidden"
            animate="show"
            exit="exit"
            variants={variants}
          >
            {children}
          </m.div>
        ) : (
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
        )
      ) : null}
    </AnimatePresence>
    </LazyMotion>
  );
}
