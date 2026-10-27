import { Pressable, Text, View } from "react-native";
import { cn } from "../cn";
import { textStyle, typeStyle } from "../controlStyles";
import { FLOATING_ROW_RADIUS } from "../floating";
import { tokens } from "../tokens";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";

export type UpgradeToProCardProps = {
  /** Opens the app's `PricingModal`. */
  onUpgrade: () => void;
  /**
   * A "Pro" pill (labelled with `title`) instead of the full card. Like the
   * web `Button` it stretches across a column and fits its label in a row.
   * Default `false`.
   */
  collapsed?: boolean;
  /** Default "Upgrade to Pro". */
  title?: string;
  /** Default "Upgrade". */
  ctaLabel?: string;
  className?: string;
  testID?: string;
};

/**
 * Upgrade prompt, the native `SidebarUpgradeCard`: the title and an "Upgrade"
 * pill on a secondary surface, with no mark. It does not check the plan; the
 * app hides it when the user is already on Pro.
 */
export function UpgradeToProCard({
  onUpgrade,
  collapsed = false,
  title = "Upgrade to Pro",
  ctaLabel = "Upgrade",
  className,
  testID,
}: UpgradeToProCardProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  // The web pill is a `Button` (`font-medium`) in `bg-foreground text-background`.
  const pill = (label: string, accessibilityLabel?: string) => (
    <Pressable
      testID={testID ? `${testID}-cta` : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onUpgrade}
      hitSlop={6}
      className={cn(
        "shrink-0 items-center justify-center rounded-full px-4 active:opacity-80",
        largerText ? "min-h-12" : "min-h-10",
      )}
      style={{ backgroundColor: tokens.color.foreground[scheme] }}
    >
      <Text
        className={cn(
          "font-instrument-sans-medium",
          largerText ? "text-base" : "text-sm",
        )}
        style={[{ color: tokens.color.background[scheme] }, typeStyle("medium")]}
      >
        {label}
      </Text>
    </Pressable>
  );

  if (collapsed) {
    return (
      <View testID={testID} className={className}>
        {pill("Pro", title)}
      </View>
    );
  }
  return (
    <View
      testID={testID}
      className={cn(
        "flex-row items-center justify-between gap-3 bg-surface-secondary px-4 py-3",
        className,
      )}
      style={{ borderRadius: FLOATING_ROW_RADIUS }}
    >
      <Text
        numberOfLines={1}
        className={cn(
          "min-w-0 flex-1 font-instrument-sans-semibold",
          largerText ? "text-lg" : "text-base",
        )}
        style={[textStyle("foreground", scheme), typeStyle("semibold")]}
      >
        {title}
      </Text>
      {pill(ctaLabel)}
    </View>
  );
}
