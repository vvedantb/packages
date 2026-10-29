import { createContext, useContext, type ReactNode } from "react";
import { Pressable, View, type PressableProps, type ViewProps } from "react-native";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react-native";
import { FadeIn } from "react-native-reanimated";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, touchSlop } from "../controlStyles";
import { NativeOnlyAnimatedView } from "../primitives/native-only-animated-view";
import { useControllableState } from "../primitives/use-controllable-state";

// A small fold for the AI parts: native-ui has no `Collapsible`. A `Pressable`
// trigger and content that mounts only while open. The content fades in on
// iOS and Android, and appears in place with Reduce Motion.

type CollapsibleContextValue = { open: boolean; setOpen: (open: boolean) => void };

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

/** The open state of the enclosing `Collapsible`, for a chevron or a custom trigger. */
export function useCollapsible() {
  const context = useContext(CollapsibleContext);
  if (!context) throw new Error("Collapsible parts must be used within Collapsible");
  return context;
}

export type CollapsibleProps = ViewProps & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** Holds its own open state, or takes `open` and `onOpenChange`, as the web Radix `Collapsible`. */
export function Collapsible({ open, defaultOpen = false, onOpenChange, ...props }: CollapsibleProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  return (
    <CollapsibleContext.Provider value={{ open: isOpen, setOpen }}>
      <View {...props} />
    </CollapsibleContext.Provider>
  );
}

/** A `text-sm` line with the web `py-1`: 28 high. The slop brings it to 44. */
const TRIGGER_ROW_HEIGHT = 28;

export type CollapsibleTriggerProps = Omit<PressableProps, "children"> & {
  className?: string;
  children?: ReactNode;
};

/** Toggles the fold. A button with `expanded` state for VoiceOver and TalkBack. */
export function CollapsibleTrigger({
  className,
  onPress,
  accessibilityState,
  ...props
}: CollapsibleTriggerProps) {
  const { open, setOpen } = useCollapsible();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={touchSlop(MIN_TOUCH_TARGET, TRIGGER_ROW_HEIGHT)}
      className={cn("active:opacity-70", className)}
      {...props}
      accessibilityState={{ ...accessibilityState, expanded: open }}
      onPress={(event) => {
        onPress?.(event);
        setOpen(!open);
      }}
    />
  );
}

/** Mounted only while the fold is open. */
export function CollapsibleContent({ children, ...props }: ViewProps & { className?: string }) {
  const { open } = useCollapsible();
  if (!open) return null;
  return (
    <NativeOnlyAnimatedView entering={FadeIn.duration(150)} {...props}>
      {children}
    </NativeOnlyAnimatedView>
  );
}

/**
 * The fold chevron: `down` turns up when open (reasoning, sources, chain of
 * thought), `right` turns down (trace lines), as the web `rotate-180` and
 * `rotate-90`. It turns at once; the web eases it over 150 ms.
 */
export function CollapsibleChevron({
  open,
  variant = "down",
  size,
  color,
}: {
  open: boolean;
  variant?: "down" | "right";
  size: number;
  color: string;
}) {
  const Icon = variant === "down" ? IconChevronDown : IconChevronRight;
  const turn = variant === "down" ? "180deg" : "90deg";
  return (
    <View style={{ transform: [{ rotate: open ? turn : "0deg" }] }}>
      <Icon size={size} color={color} />
    </View>
  );
}
