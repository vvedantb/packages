import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@tabler/icons-react-native";
import { Text, View, type TextProps, type ViewProps } from "react-native";
import {
  Card as PrimitiveCard,
  CardContent as PrimitiveCardContent,
  CardHeader as PrimitiveCardHeader,
  CardTitle as PrimitiveCardTitle,
} from "./primitives/card";
import { cn } from "./cn";
import { cardStyle, sizeStyle, textStyle, typeStyle } from "./controlStyles";
import { useAccentColor, useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export function Card({
  children,
  title,
  description,
  action,
  leftIcon: Icon,
  className,
  testID,
}: {
  children: ReactNode;
  title?: string;
  /** Muted line under the title (the web `CardDescription`). */
  description?: string;
  action?: ReactNode;
  leftIcon?: ComponentType<IconProps>;
  /** Classes on the card surface. */
  className?: string;
  testID?: string;
}) {
  const largerText = useLargerText();
  const accentColor = useAccentColor();
  const scheme = useScheme();
  const hasHeader = Boolean(title || action);
  const titleSize = largerText ? "text-2xl" : "text-base";
  // The web card: a flat `surfaceCard` fill at radius 16, with no border, no
  // shadow and no blur. Dialogs, sheets and toasts float, as on the web.
  return (
    <PrimitiveCard
      testID={testID}
      className={cn("gap-4 overflow-hidden border-0 py-4", className)}
      style={cardStyle(scheme)}
    >
      {hasHeader && (
        <PrimitiveCardHeader className="px-4 py-0">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {Icon && (
                <Icon size={largerText ? 28 : 24} color={accentColor} />
              )}
              {title ? (
                <PrimitiveCardTitle
                  className={cn("font-instrument-sans-semibold leading-tight", titleSize)}
                  style={[
                    textStyle("foreground", scheme),
                    sizeStyle(titleSize, "tight"),
                    typeStyle("semibold"),
                  ]}
                >
                  {title}
                </PrimitiveCardTitle>
              ) : null}
            </View>
            {action}
          </View>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </PrimitiveCardHeader>
      )}
      <PrimitiveCardContent className={cn(hasHeader && "pt-0", "px-4")}>
        {children}
      </PrimitiveCardContent>
    </PrimitiveCard>
  );
}

// Parts for composing a card body with the web part names. They sit inside
// `Card`'s padded content, so they add no side padding of their own. Text
// colours are styles that follow the colour scheme; recolour with `style`.

type PartProps = ViewProps & { className?: string };
type TextPartProps = TextProps & { className?: string };

export function CardHeader({ className, ...props }: PartProps) {
  return <View className={cn("gap-1 pb-3", className)} {...props} />;
}

/**
 * Web `font-semibold leading-none` at the inherited 16. The line height is
 * `leading-tight` (20), not 16: below the face's ascent and descent, iOS and
 * Android can clip the glyphs.
 */
export function CardTitle({ className, style, ...props }: TextPartProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const size = largerText ? "text-2xl" : "text-base";
  return (
    <Text
      accessibilityRole="header"
      className={cn("font-instrument-sans-semibold leading-tight", size, className)}
      style={[
        textStyle("foreground", scheme),
        sizeStyle(size, "tight"),
        typeStyle("semibold"),
        style,
      ]}
      {...props}
    />
  );
}

/** Web `text-sm` (14 / 20) in the muted colour. */
export function CardDescription({ className, style, ...props }: TextPartProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const size = largerText ? "text-lg" : "text-sm";
  return (
    <Text
      className={cn("font-instrument-sans", size, className)}
      style={[textStyle("muted", scheme), sizeStyle(size), style]}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: PartProps) {
  return <View className={cn("gap-3", className)} {...props} />;
}

export function CardFooter({ className, ...props }: PartProps) {
  return (
    <View
      className={cn("flex-row items-center justify-end gap-2 pt-4", className)}
      {...props}
    />
  );
}
