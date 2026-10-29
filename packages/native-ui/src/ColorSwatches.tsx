import { Pressable, View } from "react-native";
import { IconCheck } from "@tabler/icons-react-native";
import { cn } from "./cn";
import { touchSlop } from "./controlStyles";
import { selectionHaptic } from "./haptics";
import { withAlpha } from "./palette";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type ColorSwatchesSize = "sm" | "md" | "lg";

export type ColorSwatchesProps = {
  /** The selected colour: one of `colors`, compared without case. */
  value: string;
  onChange: (color: string) => void;
  /** `#rgb` or `#rrggbb` colours. */
  colors: string[];
  /** Swatch diameter: `sm` 24, `md` 32, `lg` 40. Default `md`. */
  size?: ColorSwatchesSize;
  /** Per-swatch accessibility labels; falls back to the colour string */
  labels?: string[];
  /** Names the group, such as "Accent colour". */
  accessibilityLabel?: string;
  testID?: string;
  disabled?: boolean;
};

/** Swatch diameters, one step up with larger text. */
const DIAMETER = {
  regular: { sm: 24, md: 32, lg: 40 },
  larger: { sm: 32, md: 40, lg: 48 },
} as const;

/** Selection ring width and the gap between the ring and the swatch. */
const RING = 2;
const RING_GAP = 2;

/**
 * The check colour on a swatch: black or white, whichever has the higher WCAG
 * contrast with it. `null` when the colour is not `#rgb` or `#rrggbb`, and the
 * ring alone marks the selection.
 */
export function swatchCheckColor(color: string): string | null {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
  const hex = short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : color;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const n = Number.parseInt(hex.slice(1), 16);
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * linear((n >> 16) & 255) + 0.7152 * linear((n >> 8) & 255) + 0.0722 * linear(n & 255);
  // Contrast with white is 1.05 / (L + 0.05); with black, (L + 0.05) / 0.05.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? tokens.color.white : tokens.color.black;
}

/**
 * Pick one colour from a row of round swatches that wraps. The selected swatch
 * has a ring in the foreground colour and a check in black or white, whichever
 * reads on it. Each swatch has a faint outline, so white shows on a white
 * surface. A radio group for VoiceOver and TalkBack: each swatch is a radio
 * named by `labels` (or its colour string). A `md` swatch is 32 across and 40
 * with its ring, and reaches 44 with its hit slop; the 12 gap keeps the slops
 * of neighbouring swatches apart.
 */
export function ColorSwatches({
  value,
  onChange,
  colors,
  size = "md",
  labels,
  accessibilityLabel,
  testID,
  disabled = false,
}: ColorSwatchesProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const diameter = DIAMETER[largerText ? "larger" : "regular"][size];
  const outer = diameter + 2 * (RING + RING_GAP);
  const selected = value.toLowerCase();
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn("flex-row flex-wrap gap-3", disabled && "opacity-50")}
    >
      {colors.map((color, index) => {
        const isSelected = color.toLowerCase() === selected;
        const check = isSelected ? swatchCheckColor(color) : null;
        return (
          <Pressable
            key={`${color}-${index}`}
            testID={testID ? `${testID}-${index}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={labels?.[index] ?? color}
            accessibilityState={{ checked: isSelected, disabled }}
            hitSlop={touchSlop(outer)}
            disabled={disabled}
            onPress={() => {
              selectionHaptic();
              onChange(color);
            }}
            className="items-center justify-center active:opacity-70"
            style={{
              width: outer,
              height: outer,
              borderRadius: outer / 2,
              borderWidth: RING,
              borderColor: isSelected ? tokens.color.foreground[scheme] : "transparent",
            }}
          >
            <View
              className="items-center justify-center"
              style={{
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                backgroundColor: color,
                borderWidth: 1,
                borderColor: withAlpha(tokens.color.foreground[scheme], 0.12),
              }}
            >
              {check ? <IconCheck size={Math.round(diameter / 2)} color={check} strokeWidth={2} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
