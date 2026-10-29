import { Linking, Pressable, View, type ViewProps } from "react-native";
import { IconBook } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, touchSlop } from "../controlStyles";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
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

/** The sources a reply used, folded (default closed). */
export function Sources({ className, ...props }: CollapsibleProps) {
  return <Collapsible className={cn("w-full", className)} {...props} />;
}

/** "Used 1 source", "Used 3 sources". */
export function sourcesLabel(count: number) {
  return `Used ${count} ${count === 1 ? "source" : "sources"}`;
}

export type SourcesTriggerProps = Omit<CollapsibleTriggerProps, "children"> & {
  count: number;
};

/** Book icon, "Used 3 sources" and a chevron, muted (web `text-xs`, here `text-sm`). */
export function SourcesTrigger({ count, className, ...props }: SourcesTriggerProps) {
  const { open } = useCollapsible();
  const scheme = useScheme();
  const largerText = useLargerText();
  const muted = tokens.color.muted[scheme];
  const iconSize = largerText ? 18 : 14;
  const label = sourcesLabel(count);
  return (
    <CollapsibleTrigger
      accessibilityLabel={label}
      className={cn("flex-row items-center gap-1.5 self-start", className)}
      {...props}
    >
      <IconBook size={iconSize} color={muted} strokeWidth={1.5} />
      <ResponseText size="small" tone="muted" selectable={false}>
        {label}
      </ResponseText>
      <CollapsibleChevron open={open} size={iconSize} color={muted} />
    </CollapsibleTrigger>
  );
}

/** The list of `Source` rows, shown while open (web `mt-2 space-y-2`). */
export function SourcesContent({ className, ...props }: ViewProps & { className?: string }) {
  return <CollapsibleContent className={cn("mt-2 gap-2", className)} {...props} />;
}

export type SourceProps = {
  href: string;
  /** Shown, and read, in place of the address. */
  title?: string;
  /** Default: `Linking.openURL(href)`, the system browser or the app that owns the link. */
  onPress?: (href: string) => void;
  testID?: string;
};

/** A `text-sm` line with the web `py-2`: 36 high. The slop brings it to 44. */
const ROW_HEIGHT = 36;

/**
 * One source as a link row: title (or address) on one line and a book icon.
 * Pressed, it takes the web hover fill (`bg-surface-secondary`).
 */
export function Source({ href, title, onPress, testID }: SourceProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const label = title ?? href;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={touchSlop(MIN_TOUCH_TARGET, ROW_HEIGHT)}
      onPress={() => (onPress ? onPress(href) : void Linking.openURL(href))}
      className="flex-row items-center justify-between gap-2 px-3 py-2"
      style={({ pressed }) => ({
        borderRadius: tokens.radius.md,
        backgroundColor: pressed ? tokens.color.surfaceSecondary[scheme] : "transparent",
      })}
    >
      <ResponseText size="small" tone="muted" selectable={false} numberOfLines={1} className="shrink">
        {label}
      </ResponseText>
      <IconBook size={largerText ? 18 : 14} color={tokens.color.muted[scheme]} strokeWidth={1.5} />
    </Pressable>
  );
}
