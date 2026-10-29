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

export type ChatIconButtonProps = Omit<ButtonProps, "children" | "size" | "icon"> & {
  icon: ComponentType<IconProps>;
  /** Names the button for VoiceOver and TalkBack; it has no text. */
  label: string;
  /** Default: the variant's label colour. */
  iconColor?: string;
};

/**
 * A round `Button` at the web `icon-sm` size (32), with the slop to 44. With
 * larger text it is painted 44 with a 20 icon. The message
 * actions, the composer tools and its send button, and the code copy button.
 */
export function ChatIconButton({
  icon: Icon,
  label,
  iconColor,
  variant = "ghost",
  className,
  ...props
}: ChatIconButtonProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = largerText ? MIN_TOUCH_TARGET : CHAT_ICON_BUTTON_SIZE;
  const color = iconColor ?? buttonColors(variant, scheme)?.color ?? tokens.color.foreground[scheme];
  return (
    <Button
      variant={variant}
      size="icon"
      accessibilityLabel={label}
      hitSlop={touchSlop(size)}
      className={cn(largerText ? "h-11 w-11" : "h-8 w-8", className)}
      style={{ borderRadius: size / 2 }}
      {...props}
    >
      <Icon size={largerText ? 20 : 16} color={color} />
    </Button>
  );
}
