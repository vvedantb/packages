import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { loadBlur } from "./blur";

type BlurTargetRef = RefObject<ComponentRef<typeof View> | null>;

type GlassBlurContextValue = {
  target: BlurTargetRef | null;
  setTarget: Dispatch<SetStateAction<BlurTargetRef | null>> | null;
};

const NO_TARGET: GlassBlurContextValue = { target: null, setTarget: null };

const GlassBlurContext = createContext<GlassBlurContextValue>(NO_TARGET);

/**
 * The mounted `GlassBlurTarget` that floating glass blurs on Android, or
 * `null` outside a `GlassBlurProvider` and inside the target itself.
 */
export function useGlassBlurTarget() {
  return useContext(GlassBlurContext).target;
}

export function GlassBlurProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<BlurTargetRef | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);

  return (
    <GlassBlurContext.Provider value={value}>{children}</GlassBlurContext.Provider>
  );
}

export type GlassBlurTargetProps = ViewProps & {
  /** Set `false` while the content is hidden, such as an unfocused tab. */
  active?: boolean;
};

/**
 * Content that floating glass blurs on Android (an expo-blur
 * `BlurTargetView`). Render the floating chrome outside it, inside the same
 * `GlassBlurProvider`: a blur view must not sit inside its own target, so
 * surfaces in here get no target. The last active target wins.
 */
export function GlassBlurTarget({
  active = true,
  style,
  children,
  ...props
}: GlassBlurTargetProps) {
  const { setTarget } = useContext(GlassBlurContext);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const BlurTargetView = loadBlur()?.BlurTargetView;

  // Publish the ref only once it is attached: expo-blur compares
  // `blurTarget.current` between renders to pick up a new target.
  useLayoutEffect(() => {
    if (!setTarget || !active) {
      return;
    }
    setTarget(ref);
    return () => setTarget((current) => (current === ref ? null : current));
  }, [setTarget, active]);

  const content = (
    <GlassBlurContext.Provider value={NO_TARGET}>{children}</GlassBlurContext.Provider>
  );

  return BlurTargetView ? (
    <BlurTargetView ref={ref} style={[styles.fill, style]} {...props}>
      {content}
    </BlurTargetView>
  ) : (
    <View ref={ref} style={[styles.fill, style]} {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
