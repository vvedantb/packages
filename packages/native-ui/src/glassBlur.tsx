import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { loadBlur } from "./blur";

type BlurTargetRef = RefObject<ComponentRef<typeof View> | null>;

/**
 * The current blur target, outside React state. A target change (each tab
 * switch hands it from one tab to the next) then re-renders only the glass
 * that subscribes, not the whole tab tree under the provider: as a context
 * value it walked every mounted tab twice per switch.
 */
type BlurTargetStore = {
  get: () => BlurTargetRef | null;
  set: (next: BlurTargetRef | null) => void;
  subscribe: (listener: () => void) => () => void;
};

function createBlurTargetStore(): BlurTargetStore {
  let current: BlurTargetRef | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (next) => {
      if (next === current) return;
      current = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// `null` outside a provider and inside a target (a blur view must not sit
// inside its own target). The value is the provider's one store, so it never
// changes.
const BlurTargetStoreContext = createContext<BlurTargetStore | null>(null);

const noSubscribe = () => () => {};
const noTarget = () => null;

/**
 * The mounted `GlassBlurTarget` that floating glass blurs on Android, or
 * `null` outside a `GlassBlurProvider` and inside the target itself.
 */
export function useGlassBlurTarget() {
  const store = useContext(BlurTargetStoreContext);
  return useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.get ?? noTarget, noTarget);
}

export function GlassBlurProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createBlurTargetStore);

  return <BlurTargetStoreContext.Provider value={store}>{children}</BlurTargetStoreContext.Provider>;
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
  const store = useContext(BlurTargetStoreContext);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const BlurTargetView = loadBlur()?.BlurTargetView;

  // Publish the ref only once it is attached: expo-blur compares
  // `blurTarget.current` between renders to pick up a new target.
  useLayoutEffect(() => {
    if (!store || !active) {
      return;
    }
    store.set(ref);
    return () => {
      if (store.get() === ref) store.set(null);
    };
  }, [store, active]);

  // Surfaces in here get no target: a blur view must not sit inside its own.
  const content = <BlurTargetStoreContext.Provider value={null}>{children}</BlurTargetStoreContext.Provider>;

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
