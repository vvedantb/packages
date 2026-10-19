import { createContext, use, useLayoutEffect, type ComponentType, type ReactNode } from "react";

/** The props `MotionConfig` from `motion/react` takes here. */
export type PageMotionConfigProps = {
  reducedMotion: "always" | "never";
  children: ReactNode;
};

export type PageMotionProviderProps = {
  /** Page motion is off, for example from a user setting. */
  disabled: boolean;
  /**
   * Pass `MotionConfig` from `motion/react`, or a component of the app that
   * wraps it (for example in `LazyMotion`). Injected so this package does not
   * import `motion`. Define it at module level, not inline.
   */
  motionConfig: ComponentType<PageMotionConfigProps>;
  children: ReactNode;
};

const PageMotionContext = createContext(false);

/** Whether page motion is off (`false` outside `PageMotionProvider`). */
export function useDisablePageMotion(): boolean {
  return use(PageMotionContext);
}

/**
 * Stamps `html[data-page-motion]` (`"off"` or `"on"`) in a layout effect so CSS
 * page and route transitions can skip, and sets Motion's `reducedMotion` to
 * `"always"` when disabled and `"never"` otherwise. The attribute stays after
 * unmount.
 */
export function PageMotionProvider({ disabled, motionConfig: MotionConfig, children }: PageMotionProviderProps) {
  useLayoutEffect(() => {
    document.documentElement.dataset.pageMotion = disabled ? "off" : "on";
  }, [disabled]);

  return (
    <PageMotionContext value={disabled}>
      <MotionConfig reducedMotion={disabled ? "always" : "never"}>{children}</MotionConfig>
    </PageMotionContext>
  );
}
