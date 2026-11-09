import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

/**
 * True when `style` gives a view a definite height or a flex grow. A style with
 * only `maxHeight`, `maxWidth` or `minHeight` does not: a `flex: 1` child of
 * such a parent collapses to height 0 on Android.
 */
export function hasDefiniteHeight(style: StyleProp<ViewStyle>): boolean {
  const flat = StyleSheet.flatten(style);
  if (flat == null) return false;
  return flat.height != null || flat.flex != null || flat.flexGrow != null;
}
