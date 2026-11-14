import { useIsFocused } from "expo-router";
import type { ReactNode } from "react";
import { GlassBlurTarget } from "../glassBlur";

export type TabScreenProps = { children: ReactNode };

/**
 * Tab content as the floating tab bar's blur target on Android (expo-blur 55+
 * needs one). Active only while the tab is focused, so the focused tab wins.
 * Apps that add a page header, tab-bar reserve or FAB build those around this.
 */
export function TabScreen({ children }: TabScreenProps) {
  const focused = useIsFocused();
  return <GlassBlurTarget active={focused}>{children}</GlassBlurTarget>;
}
