import { Pressable, View } from "react-native";
import { cn } from "./cn";
import { withAlpha } from "./palette";
import { tokens } from "./tokens";

export type CaptureButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  /** Default "Take photo". */
  accessibilityLabel?: string;
};

/** Shutter metrics: outer diameter, ring width and the gap inside the ring. */
export const CAPTURE_BUTTON = { size: 76, ring: 4, gap: 4 } as const;

/**
 * A camera shutter: a 76 white ring around a white disc, for a live preview in
 * light and dark alike. The disc shrinks to 90% while pressed. Larger than the
 * 44 target, so it needs no hit slop. A labelled button, dimmed and ignoring
 * presses when `disabled`.
 */
export function CaptureButton({
  onPress,
  disabled = false,
  testID,
  accessibilityLabel = "Take photo",
}: CaptureButtonProps) {
  const { size, ring, gap } = CAPTURE_BUTTON;
  const inner = size - 2 * (ring + gap);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn("items-center justify-center", disabled && "opacity-50")}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring,
        borderColor: tokens.color.white,
        backgroundColor: withAlpha(tokens.color.black, 0.15),
      }}
    >
      {({ pressed }) => (
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: tokens.color.white,
            transform: [{ scale: pressed && !disabled ? 0.9 : 1 }],
          }}
        />
      )}
    </Pressable>
  );
}
