import { createContext, useContext } from "react";
import { Text, type TextProps } from "react-native";
import { cn } from "../cn";
import { sizeStyle, textStyle } from "../controlStyles";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";
import { chatTextSize, type ChatTextKind } from "./chat-text";

// Markdown stub. The web renders replies with Streamdown; native-ui has no
// markdown peer, so `ResponseText` draws the text as it is, newlines kept.
// An app that wants markdown can render one of these in its place:
// `react-native-markdown-display`, `@ronradtke/react-native-markdown-display`
// (a maintained fork) or `react-native-marked`.

/**
 * The text colour `MessageContent` hands down: React Native text does not
 * inherit a colour from its parent view, as web text does from `color`.
 */
export const ChatTextColorContext = createContext<string | undefined>(undefined);

export type ResponseTextProps = Omit<TextProps, "children"> & {
  children: string;
  /** Default: the enclosing `MessageContent` colour, else the foreground. */
  tone?: "foreground" | "muted";
  /** Default `"body"` (16, `text-xl` with larger text). See `chatTextSize`. */
  size?: ChatTextKind;
  className?: string;
};

/** Plain reply text, selectable, newlines kept. The markdown placeholder. */
export function ResponseText({
  children,
  tone,
  size = "body",
  selectable = true,
  className,
  style,
  ...props
}: ResponseTextProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const inherited = useContext(ChatTextColorContext);
  const textSize = chatTextSize(size, largerText);
  const color =
    tone || !inherited ? textStyle(tone ?? "foreground", scheme) : { color: inherited };
  return (
    <Text
      selectable={selectable}
      className={cn(textSize, "font-instrument-sans", className)}
      style={[sizeStyle(textSize), color, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
