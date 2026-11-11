import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react-native";
import { Button, type ButtonProps } from "../Button";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, buttonColors, touchSlop } from "../controlStyles";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

/** The web `icon-sm` button: 32 square with a 16 icon. */
export const CHAT_ICON_BUTTON_SIZE = 32;

/**
 * Side and icon per size: `sm` is the web `icon-sm` (32, 16 icon), `xs` the
 * web `icon-xs` (28, 14 icon) and `md` the web `size-9` (36, 16 icon), Eva's
 * composer send button. `touch` has no web twin: a 44 square with a 16 icon,
 * for a row of ghost buttons a thumb taps (the message actions), where the
 * web 28 squares 2 apart are a mouse's density.
 */
const CHAT_ICON_BUTTON = {
  xs: { side: 28, icon: 14, className: "h-7 w-7" },
  sm: { side: CHAT_ICON_BUTTON_SIZE, icon: 16, className: "h-8 w-8" },
  md: { side: 36, icon: 16, className: "h-9 w-9" },
  touch: { side: MIN_TOUCH_TARGET, icon: 16, className: "h-11 w-11" },
} as const;

export type ChatIconButtonSize = keyof typeof CHAT_ICON_BUTTON;

export type ChatIconButtonProps = Omit<ButtonProps, "children" | "size" | "icon"> & {
  icon: ComponentType<IconProps>;
  /** Names the button for VoiceOver and TalkBack; it has no text. */
  label: string;
  /** Default: the variant's label colour. */
  iconColor?: string;
  /** Default `sm`. Larger text paints each 44 with a 20 icon. */
  size?: ChatIconButtonSize;
  /**
   * `"square"` (default) slops to 44 on every side. `"vertical"` slops only
   * the height to 44, for a dense row (the message actions sit 2 to 4 apart),
   * where sideways slop would overlap the next button and steal its taps.
   */
  slop?: "square" | "vertical";
};

/**
 * A round `Button` at the web `icon-sm` size (32), or another
 * `ChatIconButtonSize`, with the slop to 44. With larger text it is painted
 * 44 with a 20 icon. The message
 * actions, the composer tools and its send button, and the code copy button.
 * Round from the `Button` pill default; `shape="rounded"` gives radius 16.
 */
export function ChatIconButton({
  icon: Icon,
  label,
  iconColor,
  variant = "ghost",
  size = "sm",
  slop = "square",
  className,
  ...props
}: ChatIconButtonProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const metrics = largerText
    ? { side: MIN_TOUCH_TARGET, icon: 20, className: "h-11 w-11" }
    : CHAT_ICON_BUTTON[size];
  const color = iconColor ?? buttonColors(variant, scheme)?.color ?? tokens.color.foreground[scheme];
  return (
    <Button
      variant={variant}
      size="icon"
      accessibilityLabel={label}
      hitSlop={slop === "vertical" ? touchSlop(MIN_TOUCH_TARGET, metrics.side) : touchSlop(metrics.side)}
      className={cn(metrics.className, className)}
      {...props}
    >
      <Icon size={metrics.icon} color={color} />
    </Button>
  );
}
