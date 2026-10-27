import { Pressable, Text, View } from "react-native";
import { cn } from "../cn";
import { sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { tokens } from "../tokens";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";

/** Web `rounded-2xl` (16) on the card. */
const RADIUS = tokens.radius.lg;

// The web `Button` `sm` (`h-8 px-3 text-xs`) uses `max-sm:hit-target`, 8 on
// each side: 32 + 16 = 48, as the native `Button` `small`.
const HIT_SLOP = 8;

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
  // Each class is also set as a style (`sizeStyle`): web `text-sm` is 14 / 20.
  const titleSize = largerText ? "text-lg" : "text-sm";
  const ctaSize = largerText ? "text-base" : "text-xs";
  // The web pill is a `Button` `sm` (`font-medium`) in `bg-foreground text-background`.
  const pill = (label: string, accessibilityLabel?: string) => (
    <Pressable
      testID={testID ? `${testID}-cta` : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onUpgrade}
      hitSlop={HIT_SLOP}
      className={cn(
        "shrink-0 items-center justify-center rounded-full active:opacity-80",
        largerText ? "min-h-12 px-4" : "min-h-8 px-3",
      )}
      style={{ backgroundColor: tokens.color.foreground[scheme] }}
    >
      <Text
        className={cn("font-instrument-sans-medium", ctaSize)}
        style={[
          { color: tokens.color.background[scheme] },
          sizeStyle(ctaSize),
          typeStyle("medium"),
        ]}
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
        "flex-row items-center justify-between gap-3 bg-surface-secondary px-3 py-2.5",
        className,
      )}
      style={{ borderRadius: RADIUS }}
    >
      <Text
        numberOfLines={1}
        className={cn("min-w-0 flex-1 font-instrument-sans-semibold", titleSize)}
        style={[textStyle("foreground", scheme), sizeStyle(titleSize), typeStyle("semibold")]}
      >
        {title}
      </Text>
      {pill(ctaLabel)}
    </View>
  );
}
