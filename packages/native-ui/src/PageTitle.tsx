import type { ReactNode } from "react";
import { Text, View, type TextProps, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "./cn";
import {
  PAGE_HEADER_HEIGHT,
  PAGE_TITLE_CLASS,
  pageTitleStyle,
  textStyle,
} from "./controlStyles";
import { useScheme } from "./useScheme";

export type PageTitleProps = TextProps & { className?: string };

/**
 * The web page title (`Breadcrumb`: `text-xl font-semibold leading-tight
 * tracking-tight`): Instrument Sans 600 at 20 / 25 with -0.5 letter spacing,
 * in the scheme's foreground. A header for VoiceOver and TalkBack. One line,
 * cut off at the end as the web `truncate`; pass `numberOfLines={0}` to wrap.
 * It scales with the system font size.
 */
export function PageTitle({ className, style, ...props }: PageTitleProps) {
  const scheme = useScheme();
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      className={cn(PAGE_TITLE_CLASS, className)}
      style={[textStyle("foreground", scheme), pageTitleStyle(), style]}
      {...props}
    />
  );
}

export type PageHeaderProps = Omit<ViewProps, "children"> & {
  /** The page title, drawn with `PageTitle`. */
  title: string;
  /**
   * Content at the end of the row, such as an "Update all" `Button` (pass it
   * `fullWidth={false}`). It keeps its width; a long title is cut off instead.
   */
  action?: ReactNode;
  /**
   * Pad the top by the safe-area inset. Default `true`, for a header at the top
   * of a screen with no navigation header. Pass `false` under a native header
   * or inside a view that already pads the inset.
   */
  safeTop?: boolean;
  className?: string;
  /** Classes on the title. */
  titleClassName?: string;
};

/**
 * A screen's title row: `PageTitle` at the start and an optional `action` at
 * the end, with the `ScreenContainer` side padding (`px-4`). The row is at
 * least `PAGE_HEADER_HEIGHT` (56) high below the top inset, so tab roots with
 * and without an action put their titles at the same height.
 */
export function PageHeader({
  title,
  action,
  safeTop = true,
  className,
  titleClassName,
  style,
  ...props
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const top = safeTop ? insets.top : 0;
  return (
    <View
      className={cn("flex-row items-center justify-between gap-3 px-4", className)}
      style={[{ paddingTop: top, minHeight: top + PAGE_HEADER_HEIGHT }, style]}
      {...props}
    >
      <PageTitle className={cn("min-w-0 flex-1", titleClassName)}>{title}</PageTitle>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}
