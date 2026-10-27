import { Platform, View, type ViewProps } from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { useReduceMotion } from "../useReduceMotion";

type NativeOnlyAnimatedViewProps = ViewProps & {
  entering?: AnimatedProps<ViewProps>["entering"];
  exiting?: AnimatedProps<ViewProps>["exiting"];
  layout?: AnimatedProps<ViewProps>["layout"];
};

/**
 * `Animated.View` with layout animations on iOS and Android, a plain `View`
 * on web. With Reduce Motion on, it drops the animations: sheets, toasts and
 * the `Select` popover appear and leave in place.
 */
function NativeOnlyAnimatedView({
  children,
  entering,
  exiting,
  layout,
  ...props
}: NativeOnlyAnimatedViewProps) {
  const reduceMotion = useReduceMotion();
  if (Platform.OS === "web") {
    return <View {...props}>{children}</View>;
  }

  return (
    <Animated.View
      entering={reduceMotion ? undefined : entering}
      exiting={reduceMotion ? undefined : exiting}
      layout={reduceMotion ? undefined : layout}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export { NativeOnlyAnimatedView };
