import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import type { IconProps } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { sizeStyle, touchSlop } from "../controlStyles";
import { palette } from "../palette";
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
import { Shimmer } from "./shimmer";

// One agent step as one line: icon, title, optional faded description and an
// optional fold. Reasoning, tool calls, grouped calls and to-dos can all
// render through these parts, as on the web (`trace.tsx`). The web icon
// crossfade (`iconKey`) is not ported: the icon swaps at once.

export type AgentTraceStatus = "running" | "error" | "pending";

/** Text and icon colour of a line: muted, or the danger colour for an error (web `text-destructive`). */
export function traceLineColor(status: AgentTraceStatus | undefined, scheme: "light" | "dark") {
  return status === "error" ? palette.danger[scheme] : tokens.color.muted[scheme];
}

// Native text and icons do not inherit a colour, so the line hands its own down.
const TraceLineColorContext = createContext<string | undefined>(undefined);

function useTraceColor() {
  const scheme = useScheme();
  return useContext(TraceLineColorContext) ?? tokens.color.muted[scheme];
}

/** A column of trace lines (web `flex w-full flex-col gap-2`). */
export function AgentTrace({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("w-full min-w-0 gap-2", className)} {...props} />;
}

export type AgentTraceLineProps = ViewProps & {
  status?: AgentTraceStatus;
  className?: string;
};

/** One line: a row of icon, title and description. `pending` fades it to 60%, `error` turns it the danger colour. */
export function AgentTraceLine({ status, className, style, ...props }: AgentTraceLineProps) {
  const scheme = useScheme();
  return (
    <TraceLineColorContext.Provider value={traceLineColor(status, scheme)}>
      <View
        className={cn("min-w-0 max-w-full shrink flex-row items-center gap-2", className)}
        style={[status === "pending" ? { opacity: 0.6 } : null, style]}
        {...props}
      />
    </TraceLineColorContext.Provider>
  );
}

export type AgentTraceIconProps = {
  /** A Tabler icon, drawn 16 (20 with larger text) in the line colour. */
  icon?: ComponentType<IconProps>;
  /** Anything else in the 16 box, such as a `Spinner size="sm"`. */
  children?: ReactNode;
  className?: string;
};

/** The 16 icon box at the start of a line. Hidden from assistive tech, as the web `aria-hidden`. */
export function AgentTraceIcon({ icon: Icon, children, className }: AgentTraceIconProps) {
  const color = useTraceColor();
  const largerText = useLargerText();
  const size = largerText ? 20 : 16;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {Icon ? <Icon size={size} color={color} /> : children}
    </View>
  );
}

export type AgentTraceTitleProps = {
  children: string;
  /** Pulse the title while the step runs (`Shimmer`). */
  shimmer?: boolean;
  className?: string;
};

/** The step title, on one line, cut off at the end. */
export function AgentTraceTitle({ children, shimmer = false, className }: AgentTraceTitleProps) {
  const color = useTraceColor();
  const largerText = useLargerText();
  if (shimmer) {
    return (
      <Shimmer duration={2.5} numberOfLines={1} className={className}>
        {children}
      </Shimmer>
    );
  }
  const size = chatTextSize("small", largerText);
  return (
    <Text
      numberOfLines={1}
      className={cn(size, "min-w-0 shrink font-instrument-sans", className)}
      style={[sizeStyle(size), { color }]}
    >
      {children}
    </Text>
  );
}

/** Faded detail after the title, such as "3 files" or "12s", in tabular figures (web `opacity-70 tabular-nums`). */
export function AgentTraceDescription({ children, className }: { children: ReactNode; className?: string }) {
  const color = useTraceColor();
  const largerText = useLargerText();
  const size = chatTextSize("small", largerText);
  return (
    <Text
      numberOfLines={1}
      className={cn(size, "shrink-0 font-instrument-sans", className)}
      style={[sizeStyle(size), { color, opacity: 0.7, fontVariant: ["tabular-nums"] }]}
    >
      {children}
    </Text>
  );
}

/** A line with a fold (web `flex w-full min-w-0 flex-col`). Spread `useStreamingDisclosure(isStreaming)` on it to follow a stream. */
export function AgentTraceCollapsible({ className, ...props }: CollapsibleProps) {
  return <Collapsible className={cn("w-full min-w-0", className)} {...props} />;
}

export type AgentTraceCollapsibleTriggerProps = CollapsibleTriggerProps & {
  /**
   * Controls of their own (a pressable `FileChip`), drawn after the line and
   * outside the trigger, as on the web, so each keeps its own press and
   * accessibility label.
   */
  trailing?: ReactNode;
};

/** The line as a toggle, with a chevron after it that turns down when open. */
export function AgentTraceCollapsibleTrigger({
  children,
  trailing,
  className,
  ...props
}: AgentTraceCollapsibleTriggerProps) {
  const { open, setOpen } = useCollapsible();
  const scheme = useScheme();
  const largerText = useLargerText();
  const iconSize = largerText ? 20 : 16;
  const chevron = (
    <CollapsibleChevron open={open} variant="right" size={iconSize} color={tokens.color.muted[scheme]} />
  );
  if (trailing === undefined) {
    return (
      <CollapsibleTrigger
        className={cn("max-w-full flex-row items-center gap-1 self-start", className)}
        {...props}
      >
        {children}
        {chevron}
      </CollapsibleTrigger>
    );
  }
  return (
    <View className={cn("max-w-full flex-row items-center gap-2 self-start", className)}>
      <CollapsibleTrigger className="min-w-0 shrink flex-row items-center" {...props}>
        {children}
      </CollapsibleTrigger>
      {trailing}
      {/* The chevron toggles too, as the web overlay makes the whole line press. The trigger already names the fold. */}
      <Pressable
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        hitSlop={touchSlop(iconSize)}
        onPress={() => setOpen(!open)}
      >
        {chevron}
      </Pressable>
    </View>
  );
}

/**
 * The folded body, indented behind a rail that starts under the centre of the
 * line icon (web `ml-[calc(--spacing(2)-1px)] border-l pl-4`). A string child
 * is drawn as muted `ResponseText`.
 */
export function AgentTraceCollapsibleContent({
  children,
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const iconSize = largerText ? 20 : 16;
  return (
    <CollapsibleContent>
      <View
        className={cn("mb-1 mt-2 min-w-0 pl-4 pr-1", className)}
        style={[
          {
            marginLeft: iconSize / 2 - 1,
            borderLeftWidth: 1,
            borderLeftColor: tokens.color.border[scheme],
          },
          style,
        ]}
        {...props}
      >
        {typeof children === "string" ? (
          <ResponseText size="small" tone="muted">
            {children}
          </ResponseText>
        ) : (
          children
        )}
      </View>
    </CollapsibleContent>
  );
}
