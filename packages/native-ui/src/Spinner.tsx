import {
  ActivityIndicator,
  Platform,
  View,
  type ActivityIndicatorProps,
  type ViewProps,
} from "react-native";
import { cn } from "./cn";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type SpinnerProps = Omit<ActivityIndicatorProps, "size" | "color"> & {
  /** `sm` is 16, the web `sm` and the `Button` loading ring. `md` is the small system spinner (20), `lg` the large one. A number sets the size on Android; iOS picks small below 30. Default `"md"`. */
  size?: "sm" | "md" | "lg" | number;
  /** `"muted"` (default) uses the muted text colour, `"inherit"` the foreground. Native has no `currentColor`. */
  tone?: "muted" | "inherit";
  /** Overrides `tone`. */
  color?: string;
  /** Hide from assistive tech, for example inside a labelled button. Default `false`. */
  decorative?: boolean;
};

/** The system `"small"` spinner box on iOS, Android and React Native Web. */
const SYSTEM_SMALL = 20;
/** Web `size-4`. No platform has a 16 spinner, so `sm` is the small one scaled down in a 16 box. */
const SM = 16;

function systemSize(size: NonNullable<SpinnerProps["size"]>) {
  if (typeof size === "number") {
    return Platform.OS === "android" ? size : size >= 30 ? "large" : "small";
  }
  return size === "lg" ? "large" : "small";
}

/**
 * The platform `ActivityIndicator` with the web `Spinner` size and tone names.
 * The web `mark`, `circle` and `ring` variants (animated SVG strokes) are not ported.
 */
export function Spinner({
  size = "md",
  tone = "muted",
  color,
  decorative = false,
  accessibilityLabel,
  style,
  ...props
}: SpinnerProps) {
  const scheme = useScheme();
  const small = size === "sm";
  const indicator = (
    <ActivityIndicator
      size={systemSize(size)}
      color={
        color ??
        (tone === "muted"
          ? tokens.color.muted[scheme]
          : tokens.color.foreground[scheme])
      }
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      accessibilityRole={decorative ? undefined : "progressbar"}
      accessibilityLabel={decorative ? undefined : (accessibilityLabel ?? "Loading")}
      style={small ? { transform: [{ scale: SM / SYSTEM_SMALL }] } : style}
      {...props}
    />
  );
  if (!small) return indicator;
  return (
    <View
      style={[{ width: SM, height: SM, alignItems: "center", justifyContent: "center" }, style]}
    >
      {indicator}
    </View>
  );
}

/** A `Spinner` centred in whatever box it is given. `label` names it for assistive tech. */
export function CenteredSpinner({
  label,
  className,
  ...props
}: ViewProps & { label: string; className?: string }) {
  return (
    <View
      accessibilityState={{ busy: true }}
      className={cn("min-h-0 w-full flex-1 items-center justify-center p-6", className)}
      {...props}
    >
      <Spinner accessibilityLabel={label} />
    </View>
  );
}
