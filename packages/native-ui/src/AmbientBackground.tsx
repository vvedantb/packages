import { StyleSheet, View, type ViewProps } from "react-native";
import { cn } from "./cn";
import { loadLinearGradient } from "./gradient";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

const LIGHT = ["#f6f6f7", "#fde8f0", "#f4f5f7"] as const;
const DARK = ["#1c1c1e", "#2a1820", "#1a1a1c"] as const;

/**
 * A soft gradient behind the screen. Without the optional
 * `expo-linear-gradient` peer it draws the solid `tokens.color.background`.
 */
export function AmbientBackground({
  children,
  className,
  ...props
}: ViewProps & { className?: string }) {
  const scheme = useScheme();
  const LinearGradient = loadLinearGradient()?.LinearGradient;

  return (
    <View className={cn("flex-1", className)} {...props}>
      {LinearGradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={[...(scheme === "dark" ? DARK : LIGHT)]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: tokens.color.background[scheme],
          }}
        />
      )}
      {children}
    </View>
  );
}
