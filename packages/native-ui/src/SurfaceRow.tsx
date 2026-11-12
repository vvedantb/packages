import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { impactHaptic } from "./haptics";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

/** The web `ListRow` metrics: a 4 wide stripe 8 in from top and bottom, the surface radius. */
export const SURFACE_ROW = {
  accentWidth: 4,
  accentInset: 8,
  radius: tokens.radius.lg,
};

export type SurfaceRowProps = {
  children: ReactNode;
  /** Colour of the stripe down the leading edge: the row's status. Omit for a row with no status. */
  accentColor?: string;
  /** Fill. Default `tokens.color.surface`, the web `bg-card`. */
  backgroundColor?: string;
  /** A 1 wide hairline in this colour, such as an error row's tinted border. */
  borderColor?: string;
  /** Names the row for VoiceOver and TalkBack; the row is one button. */
  accessibilityLabel: string;
  /** Read after the label, such as the status and age. */
  accessibilityHint?: string;
  onPress: () => void;
  /**
   * A long press, such as the row menu (the web right-click), with a light
   * haptic as it fires. VoiceOver and TalkBack reach it as the `longpress`
   * action, named by `longPressLabel`.
   */
  onLongPress?: () => void;
  /** The spoken name of the long-press action. Default "More actions". */
  longPressLabel?: string;
  /** Classes on the body, in place of the web row inset `p-2.5 pl-3`. */
  className?: string;
  testID?: string;
};

/**
 * The shell of a status list row, as the web `ListRow`: a card surface with
 * the surface radius, a 4 wide status stripe on the leading edge (inset 8 top
 * and bottom, rounded on its outer side) and the body over it. The whole row
 * is one button that fades while pressed, so put no other control in it; a
 * long press (`onLongPress`) can open its menu.
 */
export function SurfaceRow({
  children,
  accentColor,
  backgroundColor,
  borderColor,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onLongPress,
  longPressLabel = "More actions",
  className,
  testID,
}: SurfaceRowProps) {
  const scheme = useScheme();
  const style = {
    backgroundColor: backgroundColor ?? tokens.color.surface[scheme],
    borderRadius: SURFACE_ROW.radius,
    borderWidth: borderColor ? 1 : 0,
    borderColor,
  };
  const body = (
    <>
      {accentColor ? (
        <View
          testID={testID ? `${testID}-accent` : undefined}
          className="absolute left-0"
          style={{
            top: SURFACE_ROW.accentInset,
            bottom: SURFACE_ROW.accentInset,
            width: SURFACE_ROW.accentWidth,
            backgroundColor: accentColor,
            borderTopRightRadius: SURFACE_ROW.accentWidth,
            borderBottomRightRadius: SURFACE_ROW.accentWidth,
          }}
        />
      ) : null}
      <View className={className ?? "p-2.5 pl-3"}>{children}</View>
    </>
  );
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={
        onLongPress
          ? () => {
              impactHaptic("light");
              onLongPress();
            }
          : undefined
      }
      accessibilityActions={onLongPress ? [{ name: "longpress", label: longPressLabel }] : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "longpress") onLongPress?.();
      }}
      className="overflow-hidden active:opacity-80"
      style={style}
    >
      {body}
    </Pressable>
  );
}
