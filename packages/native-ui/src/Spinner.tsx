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
  /** `sm` and `md` are the small system spinner, `lg` the large one. A number sets the size on Android; iOS picks small below 30. Default `"md"`. */
  size?: "sm" | "md" | "lg" | number;
  /** `"muted"` (default) uses the muted text colour, `"inherit"` the foreground. Native has no `currentColor`. */
  tone?: "muted" | "inherit";
  /** Overrides `tone`. */
  color?: string;
  /** Hide from assistive tech, for example inside a labelled button. Default `false`. */
  decorative?: boolean;
};

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
  ...props
}: SpinnerProps) {
  const scheme = useScheme();
  return (
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
      {...props}
    />
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
