import { IconMoon, IconSun } from "@tabler/icons-react-native";
import { useColorScheme } from "nativewind";
import { HeaderIconButton } from "./HeaderIconButton";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type ThemeToggleProps = {
  testID?: string;
};

/**
 * A `HeaderIconButton` that switches between light and dark with NativeWind's
 * `setColorScheme`, the scheme `useScheme` reads. It shows and names the
 * scheme it switches to: a moon and "Switch to dark mode" in light, a sun and
 * "Switch to light mode" in dark. The choice lasts only as long as NativeWind
 * keeps it; an app that restores it on the next launch stores
 * `useColorScheme().colorScheme` itself.
 */
export function ThemeToggle({ testID }: ThemeToggleProps) {
  const { setColorScheme } = useColorScheme();
  const scheme = useScheme();
  const largerText = useLargerText();
  const next = scheme === "dark" ? "light" : "dark";
  const Icon = next === "dark" ? IconMoon : IconSun;

  return (
    <HeaderIconButton
      label={`Switch to ${next} mode`}
      testID={testID}
      onPress={() => setColorScheme(next)}
    >
      <Icon size={largerText ? 26 : 22} color={tokens.color.foreground[scheme]} />
    </HeaderIconButton>
  );
}
