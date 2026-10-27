import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@tabler/icons-react-native";
import { Text, View, type TextProps, type ViewProps } from "react-native";
import {
  Card as PrimitiveCard,
  CardContent as PrimitiveCardContent,
  CardHeader as PrimitiveCardHeader,
  CardTitle as PrimitiveCardTitle,
} from "./primitives/card";
import { FloatingSurface } from "./FloatingSurface";
import { cn } from "./cn";
import { useAccentColor, useLargerText } from "./theme";

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
  /** Classes on the floating surface. */
  className?: string;
  testID?: string;
}) {
  const largerText = useLargerText();
  const accentColor = useAccentColor();
  const hasHeader = Boolean(title || action);
  return (
    <FloatingSurface className={className}>
      <PrimitiveCard
        testID={testID}
        className="gap-4 rounded-none border-0 bg-transparent py-4"
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
                    className={cn(
                      "font-instrument-sans-bold text-foreground",
                      largerText ? "text-2xl" : "text-xl",
                    )}
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
    </FloatingSurface>
  );
}

// Parts for composing a card body with the web part names. They sit inside
// `Card`'s padded content, so they add no side padding of their own.

type PartProps = ViewProps & { className?: string };
type TextPartProps = TextProps & { className?: string };

export function CardHeader({ className, ...props }: PartProps) {
  return <View className={cn("gap-1 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: TextPartProps) {
  const largerText = useLargerText();
  return (
    <Text
      accessibilityRole="header"
      className={cn(
        "font-instrument-sans-bold text-foreground",
        largerText ? "text-2xl" : "text-xl",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: TextPartProps) {
  const largerText = useLargerText();
  return (
    <Text
      className={cn(
        "font-instrument-sans text-muted-foreground",
        largerText ? "text-lg" : "text-base",
        className,
      )}
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
