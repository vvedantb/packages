import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import { View, Text, type TextProps, type ViewProps } from "react-native";
import { IconInbox, type IconProps } from "@tabler/icons-react-native";
import { NEUTRAL_500 } from "./colors";
import { cn } from "./cn";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

function EmptyStateView({
  title,
  description,
  icon: Icon = IconInbox,
  action,
  compact = false,
  testID,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<IconProps>;
  action?: ReactNode;
  compact?: boolean;
  testID?: string;
}) {
  const largerText = useLargerText();
  return (
    <View
      testID={testID}
      className={`items-center px-4 ${compact ? "py-6" : "py-16"}`}
    >
      <Icon size={largerText ? 44 : 40} color={NEUTRAL_500} />
      <Text
        className={cn(
          "mt-4 text-center font-instrument-sans-semibold text-foreground",
          largerText ? "text-xl" : "text-lg",
        )}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className={cn(
            "mt-2 max-w-sm text-center font-instrument-sans text-muted-foreground",
            largerText ? "text-lg" : "text-base",
          )}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-6">{action}</View> : null}
    </View>
  );
}

// Composable parts with the web names (`EmptyState.Root`, `.Icon`, `.Title`,
// `.Description`, `.Actions`). `Root` sets the variant, the parts read it.

/** `default`: open centred block with a large bare icon. `panel`: filled rounded block, icon in a tile. */
export type EmptyStateVariant = "default" | "panel";

const EmptyStateContext = createContext<EmptyStateVariant>("default");

function Root({
  variant = "default",
  className,
  ...props
}: ViewProps & { variant?: EmptyStateVariant; className?: string }) {
  return (
    <EmptyStateContext.Provider value={variant}>
      <View
        className={cn(
          "items-center justify-center",
          variant === "panel"
            ? "rounded-[20px] bg-surface-secondary px-4 py-10"
            : "px-4 py-16",
          className,
        )}
        {...props}
      />
    </EmptyStateContext.Provider>
  );
}

function Icon({
  icon: IconComponent,
  size,
  stroke,
  className,
}: {
  icon: ComponentType<IconProps>;
  /** Default 40 (`default`) or 22 (`panel`). */
  size?: number;
  /** Default the icon's own (`default`) or 1.5 (`panel`). */
  stroke?: number;
  className?: string;
}) {
  const variant = useContext(EmptyStateContext);
  const scheme = useScheme();
  if (variant === "panel") {
    return (
      <View
        className={cn("mb-3 h-11 w-11 items-center justify-center rounded-xl", className)}
        style={{ backgroundColor: palette.surfaceTertiary[scheme] }}
      >
        <IconComponent size={size ?? 22} stroke={stroke ?? 1.5} color={NEUTRAL_500} />
      </View>
    );
  }
  return (
    <View className={cn("mb-4", className)}>
      <IconComponent size={size ?? 40} stroke={stroke} color={NEUTRAL_500} />
    </View>
  );
}

function Title({ className, ...props }: TextProps & { className?: string }) {
  const largerText = useLargerText();
  return (
    <Text
      className={cn(
        "text-center font-instrument-sans-semibold text-foreground",
        largerText ? "text-xl" : "text-lg",
        className,
      )}
      {...props}
    />
  );
}

function Description({ className, ...props }: TextProps & { className?: string }) {
  const largerText = useLargerText();
  return (
    <Text
      className={cn(
        "mt-2 max-w-sm text-center font-instrument-sans text-muted-foreground",
        largerText ? "text-lg" : "text-base",
        className,
      )}
      {...props}
    />
  );
}

function Actions({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("mt-6", className)} {...props} />;
}

/**
 * "Nothing here yet" block. Call it with `title`, `description`, `icon` and
 * `action`, or compose `EmptyState.Root` and its parts as on the web.
 */
export const EmptyState = Object.assign(EmptyStateView, {
  Root,
  Icon,
  Title,
  Description,
  Actions,
});
