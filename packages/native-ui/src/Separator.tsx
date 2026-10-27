import { StyleSheet, View, type ViewProps } from "react-native";
import { cn } from "./cn";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type SeparatorProps = ViewProps & {
  /** Default `"horizontal"`. */
  orientation?: "horizontal" | "vertical";
  /** Hidden from assistive tech. Default `true`, as on the web. */
  decorative?: boolean;
  className?: string;
};

/** Hairline in `tokens.color.separator`. Vertical separators stretch to the row height. */
export function Separator({
  orientation = "horizontal",
  decorative = true,
  className,
  style,
  ...props
}: SeparatorProps) {
  const scheme = useScheme();
  return (
    <View
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      className={cn("shrink-0", className)}
      style={[
        orientation === "horizontal"
          ? { height: StyleSheet.hairlineWidth, width: "100%" }
          : { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
        { backgroundColor: tokens.color.separator[scheme] },
        style,
      ]}
      {...props}
    />
  );
}
