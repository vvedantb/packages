import { Pressable, Text, View } from "react-native";
import { cn } from "../cn";
import { tokens } from "../tokens";
import { WORDMARK } from "../typography";
import { useScheme } from "../useScheme";
import { APP_ICONS } from "./AppIcons";
import type { AppName } from "./svg";

/** The five product apps. `projectv` keeps its Michroma wordmark and never uses `AppWordmark`. */
export type ProductAppName = Exclude<AppName, "projectv">;

export type AppWordmarkProps = {
  /** Which product app's name to show. The label is always the lowercase app id. */
  app: ProductAppName;
  /** Text font size in points (default 24). The icon is `Math.round(size * 1.4)` square and the gap is `0.2em`. */
  size?: number;
  /** `false` renders the name only (default `true`). */
  icon?: boolean;
  /** Icon and text colour. Default the scheme's `tokens.color.foreground`. */
  color?: string;
  /** When set, the wordmark is a pressable link (the web `href`). */
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
  testID?: string;
};

/**
 * Wordmark for a product app: the `APP_ICONS` glyph, then the lowercase name in
 * Instrument Sans 500 (`font-instrument-sans-medium`) with -0.02em letter
 * spacing, as the web `AppWordmark`. No serif, no italic.
 */
export function AppWordmark({
  app,
  size = 24,
  icon = true,
  color,
  onPress,
  accessibilityLabel,
  className,
  testID,
}: AppWordmarkProps) {
  const scheme = useScheme();
  const Icon = APP_ICONS[app];
  const fg = color ?? tokens.color.foreground[scheme];
  const content = (
    <>
      {icon ? (
        <Icon size={Math.round(size * WORDMARK.iconScale)} color={fg} />
      ) : null}
      <Text
        className={WORDMARK.fontClass}
        style={{
          fontSize: size,
          lineHeight: size,
          letterSpacing: size * WORDMARK.letterSpacingEm,
          color: fg,
          includeFontPadding: false,
        }}
      >
        {app}
      </Text>
    </>
  );
  const rowClassName = cn("flex-row items-center", className);
  const rowStyle = { gap: size * WORDMARK.gapEm };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel ?? app}
        onPress={onPress}
        className={cn(rowClassName, "active:opacity-70")}
        style={rowStyle}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? app}
      className={rowClassName}
      style={rowStyle}
    >
      {content}
    </View>
  );
}
AppWordmark.displayName = "AppWordmark";
