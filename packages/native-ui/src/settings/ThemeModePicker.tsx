import { IconCheck, IconCircleHalf, IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { cn } from "../cn";
import { sizeStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

/** A theme the picker can show, as the web `ThemeModePicker`. Neutral is the dark scheme with a grey palette. */
export type ThemeMode = "light" | "neutral" | "dark" | "system";

/** Default order: light to dark, then system. */
export const THEME_MODES = ["light", "neutral", "dark", "system"] as const satisfies readonly ThemeMode[];

const LABELS: Record<ThemeMode, string> = { light: "Light", neutral: "Neutral", dark: "Dark", system: "System" };
const ICONS = { light: IconSun, neutral: IconCircleHalf, dark: IconMoon, system: IconDeviceDesktop };
/** Web `bg-zinc-900`. */
const ZINC_900 = "#18181b";
// Swatches and icons show the theme itself, so they use the web's fixed colours, not tokens.
// System has no swatch colour (it is a gradient) and a muted icon.
const SWATCHES: Record<ThemeMode, string | null> = {
  light: "#ffffff",
  neutral: "#3f3f46",
  dark: ZINC_900,
  system: null,
};
const ICON_COLOURS: Record<ThemeMode, string | null> = {
  light: "#f59e0b",
  neutral: "#d4d4d8",
  dark: "#93c5fd",
  system: null,
};

export type ThemeModePickerProps = {
  /** The stored choice, not the resolved scheme. */
  value: string | undefined;
  onChange: (mode: ThemeMode) => void;
  /** Themes to show, in order. Default `THEME_MODES`. */
  modes?: readonly ThemeMode[];
  className?: string;
  /** Each tile gets `${testID}-${mode}`. */
  testID?: string;
};

/** The web System swatch, `bg-linear-to-br from-white to-zinc-900`. */
function GradientSwatch() {
  return (
    // Sized by props: an unsized Svg is 300 wide and widens the tile.
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="theme-mode-system" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="1" stopColor={ZINC_900} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#theme-mode-system)" />
    </Svg>
  );
}

/**
 * Theme tiles for an Appearance settings section, as the web
 * `ThemeModePicker`: a swatch with the theme icon over the label, in one row
 * that the tiles share evenly. The selected tile gets the border, a primary
 * wash and a check badge. The app owns the stored mode and how Neutral paints.
 */
export function ThemeModePicker({ value, onChange, modes = THEME_MODES, className, testID }: ThemeModePickerProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const labelSize = largerText ? "text-base" : "text-sm";
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Theme" className={cn("flex-row gap-2", className)}>
      {modes.map((mode) => {
        const active = value === mode;
        const Icon = ICONS[mode];
        const swatch = SWATCHES[mode];
        return (
          <Pressable
            key={mode}
            testID={testID ? `${testID}-${mode}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={LABELS[mode]}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(mode)}
            className="flex-1 items-center gap-2 rounded-2xl border px-1 py-3 active:opacity-80"
            style={{
              borderColor: active ? tokens.color.border[scheme] : "transparent",
              backgroundColor: active
                ? withAlpha(palette.primary[scheme], 0.08)
                : withAlpha(tokens.color.surfaceSecondary[scheme], 0.4),
            }}
          >
            <View
              className="mx-2 h-12 items-center justify-center self-stretch overflow-hidden rounded-2xl"
              style={swatch ? { backgroundColor: swatch } : undefined}
            >
              {swatch ? null : <GradientSwatch />}
              {/* Positioned, so the web build paints it over the positioned gradient. */}
              <View className="absolute inset-0 items-center justify-center">
                <Icon size={22} color={ICON_COLOURS[mode] ?? tokens.color.muted[scheme]} />
              </View>
            </View>
            {/* After the swatch, so it draws over the swatch corner. */}
            {active ? (
              <View
                className="absolute right-2 top-2 h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: palette.primary[scheme] }}
              >
                <IconCheck size={10} strokeWidth={3} color={palette.primaryForeground[scheme]} />
              </View>
            ) : null}
            {/* On a narrow phone at a large font scale, "Neutral" shrinks to fit, not wraps. */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className={cn("font-instrument-sans-medium", labelSize)}
              style={[
                sizeStyle(labelSize),
                typeStyle("medium"),
                { color: active ? palette.primary[scheme] : tokens.color.muted[scheme] },
              ]}
            >
              {LABELS[mode]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
