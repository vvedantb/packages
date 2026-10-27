import { View, type ViewProps } from "react-native";
import { cn } from "./cn";
import { palette, withAlpha } from "./palette";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

/** The web `StatusTone`s. */
export type StatusTone =
  | "progress"
  | "business-review"
  | "code-review"
  | "done"
  | "cancelled"
  | "active"
  | "critical"
  | "neutral";

export type StatusDotProps = ViewProps & {
  tone: StatusTone;
  /** `"sm"` (6) or `"md"` (8). Default `"sm"`. */
  size?: "sm" | "md";
  className?: string;
};

function toneColor(tone: StatusTone, scheme: "light" | "dark") {
  switch (tone) {
    case "progress":
      return palette.warning[scheme];
    case "business-review":
      return palette.primary[scheme];
    case "code-review":
      return withAlpha(palette.primary[scheme], 0.7);
    case "done":
    case "active":
      return palette.success[scheme];
    case "cancelled":
      return withAlpha(tokens.color.muted[scheme], 0.4);
    case "critical":
      return palette.danger[scheme];
    default:
      return withAlpha(tokens.color.muted[scheme], 0.6);
  }
}

/** Small coloured dot that carries a status, so the label beside it stays neutral text. Hidden from assistive tech. */
export function StatusDot({ tone, size = "sm", className, style, ...props }: StatusDotProps) {
  const scheme = useScheme();
  const diameter = size === "md" ? 8 : 6;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("shrink-0", className)}
      style={[
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: toneColor(tone, scheme),
        },
        style,
      ]}
      {...props}
    />
  );
}
