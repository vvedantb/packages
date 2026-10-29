import { useEffect } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { cn } from "../cn";
import { sizeStyle, textStyle } from "../controlStyles";
import { useLargerText } from "../theme";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { chatTextSize, type ChatTextKind } from "./chat-text";

/**
 * Lowest opacity of the pulse. The foreground at 0.45 on the page is close to
 * the muted colour, the far end of the web sweep.
 */
export const SHIMMER_LOW_OPACITY = 0.45;

export type ShimmerProps = {
  children: string;
  /** Seconds for one pass, as on the web. Default 2. */
  duration?: number;
  /** Default `"small"` (14, `text-lg` with larger text). */
  size?: ChatTextKind;
  numberOfLines?: number;
  className?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * "Live" text, such as "Thinking…". The web sweeps a foreground band across
 * muted text (`bg-clip-text`), which React Native cannot clip to the glyphs
 * without a masked view. Here the foreground text fades to
 * `SHIMMER_LOW_OPACITY` and back once per `duration`, on the UI thread with
 * Reanimated. With Reduce Motion it holds still in the muted colour.
 */
export function Shimmer({
  children,
  duration = 2,
  size = "small",
  numberOfLines,
  className,
  style,
}: ShimmerProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(SHIMMER_LOW_OPACITY, { duration: (duration * 1000) / 2 }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion, duration]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const textSize = chatTextSize(size, largerText);

  return (
    <Animated.View className="min-w-0 shrink" style={animatedStyle}>
      <Text
        numberOfLines={numberOfLines}
        className={cn(textSize, "font-instrument-sans", className)}
        style={[
          sizeStyle(textSize),
          textStyle(reduceMotion ? "muted" : "foreground", scheme),
          style,
        ]}
      >
        {children}
      </Text>
    </Animated.View>
  );
}
