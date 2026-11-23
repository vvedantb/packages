import type { ReactNode } from "react";
import { Text, View, type StyleProp, type TextProps, type TextStyle, type ViewProps, type ViewStyle } from "react-native";
import Animated, { ReduceMotion, SharedTransition, type FadeContentConfig } from "react-native-reanimated";
import { useReduceMotion } from "./useReduceMotion";

// Shared element transitions (Reanimated 4.8): a view with the same
// `sharedTransitionTag` on two screens moves and resizes from one to the other
// as the screens change. Docs:
// https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/shared-transition/
// https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/children-of-shared-views/

/** Spring length for a list-to-detail move, in ms. */
export const SHARED_TRANSITION_DURATION = 280;

/**
 * Critically damped (1): the shared view settles with no bounce, as a
 * list-to-detail move should. Also easier on a low-end Android GPU.
 */
export const SHARED_TRANSITION_DAMPING_RATIO = 1;

/**
 * Children of the shared views: the source's children are gone by 55% of the
 * move, and the target's children fade in over 180 ms once it lands. This hides
 * the squash of text and icons while the box resizes.
 */
export const DEFAULT_FADE_CONTENT: FadeContentConfig = {
  fadeOut: { end: 0.55 },
  fadeIn: { duration: 180 },
};

export type SharedTransitionOverrides = {
  /** Spring length in ms. Default `280`. */
  duration?: number;
  /** Default `1` (no bounce). */
  dampingRatio?: number;
  /** Default `DEFAULT_FADE_CONTENT`. Pass `false` to leave children as they are (no `fadeContent`). */
  fadeContent?: FadeContentConfig | false;
};

/**
 * A new `SharedTransition` builder with the kit defaults and `overrides`. It
 * always applies `ReduceMotion.System`, so the system setting skips the move.
 * Builders are mutable: this returns a fresh one on every call.
 */
export function createSharedTransition(overrides: SharedTransitionOverrides = {}): SharedTransition {
  const { duration = SHARED_TRANSITION_DURATION, dampingRatio = SHARED_TRANSITION_DAMPING_RATIO, fadeContent = DEFAULT_FADE_CONTENT } = overrides;
  const builder = SharedTransition.springify(duration).dampingRatio(dampingRatio).reduceMotion(ReduceMotion.System);
  return fadeContent === false ? builder : builder.fadeContent(fadeContent);
}

/** The default builder, for `sharedTransitionStyle`. Do not chain on it: use `createSharedTransition`. */
export const DEFAULT_SHARED_TRANSITION: SharedTransition = createSharedTransition();

/**
 * A tag for `sharedTransitionTag`, prefixed so it cannot clash with a tag from
 * another library. Give both screens the same `id`.
 */
export function sharedTransitionTag(id: string): string {
  return `nui:${id}`;
}

/**
 * The default shared transition, or `undefined` with Reduce Motion on. Spread
 * the result with the tag only when it is defined:
 * `<Animated.View sharedTransitionTag={style ? tag : undefined} sharedTransitionStyle={style} />`.
 */
export function useSharedTransitionStyle(): SharedTransition | undefined {
  return useReduceMotion() ? undefined : DEFAULT_SHARED_TRANSITION;
}

export type SharedTransitionViewProps = Omit<ViewProps, "style"> & {
  /** The id both screens share. Namespaced with `sharedTransitionTag`. */
  tag: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * An `Animated.View` that takes part in a shared element transition with the
 * `SharedTransitionView` that has the same `tag` on the other screen. With
 * Reduce Motion on it is a plain `View`: the screens change with no shared move.
 * NativeWind does not style an `Animated.View`, so use `style`.
 */
export function SharedTransitionView({ tag, style, children, ...rest }: SharedTransitionViewProps) {
  const transition = useSharedTransitionStyle();
  if (!transition) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <Animated.View sharedTransitionTag={sharedTransitionTag(tag)} sharedTransitionStyle={transition} style={style} {...rest}>
      {children}
    </Animated.View>
  );
}

export type SharedTransitionTextProps = Omit<TextProps, "style"> & {
  tag: string;
  style?: StyleProp<TextStyle>;
};

/** `SharedTransitionView` for text: an `Animated.Text`, or a plain `Text` with Reduce Motion on. */
export function SharedTransitionText({ tag, style, children, ...rest }: SharedTransitionTextProps) {
  const transition = useSharedTransitionStyle();
  if (!transition) {
    return (
      <Text style={style} {...rest}>
        {children}
      </Text>
    );
  }
  return (
    <Animated.Text sharedTransitionTag={sharedTransitionTag(tag)} sharedTransitionStyle={transition} style={style} {...rest}>
      {children}
    </Animated.Text>
  );
}
