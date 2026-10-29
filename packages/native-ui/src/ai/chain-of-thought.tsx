import type { ComponentType, ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
import { IconBrain, IconPointFilled, type IconProps } from "@tabler/icons-react-native";
import { badgeColors, Badge } from "../Badge";
import { cn } from "../cn";
import { sizeStyle } from "../controlStyles";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
  type CollapsibleProps,
  type CollapsibleTriggerProps,
} from "./collapsible";
import { ResponseText } from "./response-text";

// The web `ChainOfThought`, simplified: a fold of steps with search-result
// chips. `ChainOfThoughtImage` and the step enter animation are not ported.

/** Holds its open state (default closed), or takes `open` and `onOpenChange`. */
export function ChainOfThought({ className, ...props }: CollapsibleProps) {
  return <Collapsible className={cn("w-full gap-4", className)} {...props} />;
}

export type ChainOfThoughtHeaderProps = Omit<CollapsibleTriggerProps, "children"> & {
  /** Default "Chain of Thought". A string, as it is also the accessibility label. */
  children?: string;
  icon?: ComponentType<IconProps>;
};

/** Brain icon, title and chevron: toggles the steps. */
export function ChainOfThoughtHeader({
  children = "Chain of Thought",
  icon: Icon = IconBrain,
  className,
  ...props
}: ChainOfThoughtHeaderProps) {
  const { open } = useCollapsible();
  const scheme = useScheme();
  const largerText = useLargerText();
  const muted = tokens.color.muted[scheme];
  const iconSize = largerText ? 20 : 16;
  return (
    <CollapsibleTrigger
      accessibilityLabel={children}
      className={cn("w-full flex-row items-center gap-2", className)}
      {...props}
    >
      <Icon size={iconSize} color={muted} />
      <ResponseText size="small" tone="muted" selectable={false} className="flex-1">
        {children}
      </ResponseText>
      <CollapsibleChevron open={open} size={iconSize} color={muted} />
    </CollapsibleTrigger>
  );
}

/** The steps, shown while open. */
export function ChainOfThoughtContent({ className, ...props }: ViewProps & { className?: string }) {
  return <CollapsibleContent className={cn("gap-3", className)} {...props} />;
}

export type ChainOfThoughtStepStatus = "complete" | "active" | "pending";

export type ChainOfThoughtStepProps = ViewProps & {
  icon?: ComponentType<IconProps>;
  label: string;
  description?: string;
  /** `active` is the foreground, `complete` muted, `pending` muted at half opacity, as on the web. Default `complete`. */
  status?: ChainOfThoughtStepStatus;
  className?: string;
  children?: ReactNode;
};

/** One step: icon with a rail under it to the next step, label, description and any children (such as search results). */
export function ChainOfThoughtStep({
  icon: Icon = IconPointFilled,
  label,
  description,
  status = "complete",
  className,
  style,
  children,
  ...props
}: ChainOfThoughtStepProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const tone = status === "active" ? "foreground" : "muted";
  return (
    <View
      className={cn("flex-row gap-2", className)}
      style={[status === "pending" ? { opacity: 0.5 } : null, style]}
      {...props}
    >
      <View className="mt-0.5 items-center">
        <Icon size={largerText ? 20 : 16} color={tokens.color[tone][scheme]} />
        <View
          className="mt-2 w-px flex-1"
          style={{ backgroundColor: tokens.color.separator[scheme] }}
        />
      </View>
      <View className="min-w-0 flex-1 gap-2">
        <ResponseText size="small" tone={tone}>
          {label}
        </ResponseText>
        {description ? (
          <ResponseText size="caption" tone="muted">
            {description}
          </ResponseText>
        ) : null}
        {children}
      </View>
    </View>
  );
}

/** A wrapping row of `ChainOfThoughtSearchResult` chips. */
export function ChainOfThoughtSearchResults({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("flex-row flex-wrap items-center gap-2", className)} {...props} />;
}

/** One search result: a `secondary` `Badge` with regular `text-xs` type, as the web `font-normal text-xs`. */
export function ChainOfThoughtSearchResult({ children, className }: { children: string; className?: string }) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("caption", largerText);
  return (
    <Badge variant="secondary" className={cn("px-2 py-0.5", className)}>
      <Text
        numberOfLines={1}
        className={cn(size, "font-instrument-sans")}
        style={[sizeStyle(size), { color: badgeColors("secondary", scheme).color }]}
      >
        {children}
      </Text>
    </Badge>
  );
}
