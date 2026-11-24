import { StyleSheet, View, type ViewProps } from "react-native";
import { cn } from "./cn";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

/** A flat `tokens.color.background` layer behind the screen. */
export function AmbientBackground({
  children,
  className,
  ...props
}: ViewProps & { className?: string }) {
  const scheme = useScheme();

  return (
    <View className={cn("flex-1", className)} {...props}>
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: tokens.color.background[scheme],
        }}
      />
      {children}
    </View>
  );
}
