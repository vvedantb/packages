import { IconMoon, IconSun } from "@tabler/icons-react-native";
import { useColorScheme } from "nativewind";
import { HeaderIconButton } from "./HeaderIconButton";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type ThemeToggleProps = {
  testID?: string;
};

/** Logged when NativeWind's `setColorScheme` throws. */
const DARK_MODE_CLASS_HINT =
  'ThemeToggle could not set the colour scheme. NativeWind throws while Tailwind darkMode is "media" (the default): set darkMode: "class" in tailwind.config.js. See the @vvedantb/native-ui README, Theme.';

/**
 * A `HeaderIconButton` that switches between light and dark with NativeWind's
 * `setColorScheme`, the scheme `useScheme` reads. It shows and names the
 * scheme it switches to: a moon and "Switch to dark mode" in light, a sun and
 * "Switch to light mode" in dark. The choice lasts only as long as NativeWind
 * keeps it; an app that restores it on the next launch stores
 * `useColorScheme().colorScheme` itself.
 *
 * `setColorScheme` throws unless the app sets Tailwind `darkMode: "class"`.
 * The press then logs that fix with `console.error` and leaves the scheme as
 * it is, instead of throwing from the press handler.
 */
export function ThemeToggle({ testID }: ThemeToggleProps) {
  const { setColorScheme } = useColorScheme();
  const scheme = useScheme();
  const largerText = useLargerText();
  const next = scheme === "dark" ? "light" : "dark";
  const Icon = next === "dark" ? IconMoon : IconSun;

  const toggle = () => {
    try {
      setColorScheme(next);
    } catch (error) {
      console.error(DARK_MODE_CLASS_HINT, error);
    }
  };

  return (
    <HeaderIconButton label={`Switch to ${next} mode`} testID={testID} onPress={toggle}>
      <Icon size={largerText ? 26 : 22} color={tokens.color.foreground[scheme]} />
    </HeaderIconButton>
  );
}
