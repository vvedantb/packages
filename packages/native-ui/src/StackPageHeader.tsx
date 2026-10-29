import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "./cn";
import { PAGE_HEADER_HEIGHT, sizeStyle, textStyle } from "./controlStyles";
import { HeaderIconButton } from "./HeaderIconButton";
import { PageTitle } from "./PageTitle";
import { useLargerText } from "./theme";
import { tokens } from "./tokens";
import { useScheme } from "./useScheme";

export type StackPageHeaderProps = {
  title: string;
  /** Muted line under the title, up to two lines. */
  description?: string;
  /** Shows a back `HeaderIconButton` at the start that calls this. No button without it. */
  onBack?: () => void;
  /** Names the back button. Default "Back". */
  backLabel?: string;
  /** Actions at the end, such as a `HeaderIconButton`. */
  headerRight?: ReactNode;
  backTestID?: string;
  /**
   * Pad the top by the safe-area inset. Default `true`. Pass `false` under a
   * native header or inside a view that already pads the inset.
   */
  safeTop?: boolean;
  testID?: string;
  className?: string;
};

/**
 * A stack screen header with no fill, for a screen over `AmbientBackground`:
 * a back chevron `HeaderIconButton` at the start, `headerRight` at the end and
 * a centred `PageTitle` (Instrument Sans 600 at 20 / 25) with an optional
 * muted description. The two sides are the same width, the wider of the back
 * button and `headerRight`, so the title stays centred on the screen and a
 * long one is cut off before it reaches them. The row is at least 56 high
 * below the top inset, as `PageHeader`, with the `px-4` screen padding.
 */
export function StackPageHeader({
  title,
  description,
  onBack,
  backLabel = "Back",
  headerRight,
  backTestID,
  safeTop = true,
  testID,
  className,
}: StackPageHeaderProps) {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const largerText = useLargerText();
  const [rightWidth, setRightWidth] = useState(0);
  const top = safeTop ? insets.top : 0;
  // `HeaderIconButton` is 48 across (56 with larger text).
  const backWidth = onBack ? (largerText ? 56 : 48) : 0;
  const side = { minWidth: Math.max(backWidth, headerRight != null ? rightWidth : 0) };
  const descriptionSize = largerText ? "text-base" : "text-sm";

  return (
    <View
      testID={testID}
      className={cn("flex-row items-center gap-2 px-4", className)}
      style={{ paddingTop: top, minHeight: top + PAGE_HEADER_HEIGHT }}
    >
      <View className="flex-1 flex-row items-center justify-start" style={side}>
        {onBack ? (
          <HeaderIconButton label={backLabel} testID={backTestID} onPress={onBack}>
            <IconChevronLeft size={largerText ? 26 : 22} color={tokens.color.foreground[scheme]} />
          </HeaderIconButton>
        ) : null}
      </View>
      <View className="min-w-0 shrink items-center py-2">
        <PageTitle className="text-center">{title}</PageTitle>
        {description ? (
          <Text
            numberOfLines={2}
            className={cn("text-center font-instrument-sans", descriptionSize)}
            style={[textStyle("muted", scheme), sizeStyle(descriptionSize)]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View className="flex-1 flex-row items-center justify-end" style={side}>
        {headerRight != null ? (
          <View
            className="flex-row items-center gap-2"
            onLayout={(event) => setRightWidth(event.nativeEvent.layout.width)}
          >
            {headerRight}
          </View>
        ) : null}
      </View>
    </View>
  );
}
