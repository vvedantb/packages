import { TouchableOpacity } from "react-native";
import { withAlpha } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

/**
 * Fill and border of `HeaderIconButton`: the surface with a white hairline
 * (40%) in light and, in dark, the glass `tokens.color.hairline` of the
 * floating tab bar, so `configureTheme` sets both. Styles, not `bg-surface`,
 * which an app theme that nests `dark` under `surface` keeps white in dark mode.
 */
export function headerIconButtonColors(scheme: "light" | "dark") {
  return {
    backgroundColor: tokens.color.surface[scheme],
    borderColor: scheme === "dark" ? tokens.color.hairline.dark : withAlpha(tokens.color.white, 0.4),
  };
}

export function HeaderIconButton({
  onPress,
  label,
  testID,
  children,
}: {
  onPress: () => void;
  label: string;
  testID?: string;
  children: React.ReactNode;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <TouchableOpacity
      testID={testID}
      className={`${largerText ? "h-14 w-14" : "h-12 w-12"} items-center justify-center rounded-full border`}
      style={headerIconButtonColors(scheme)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}
