import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";
import { cn } from "./cn";
import { sizeStyle, textStyle, typeStyle } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type SectionLabelProps = TextProps & {
  className?: string;
  children: ReactNode;
  /** Capitals with the web menu label tracking (`uppercase tracking-widest`). Default `false`. */
  uppercase?: boolean;
};

/** Letter spacing in em: slightly open, or the web `tracking-widest` (0.1em) in capitals. */
const TRACKING = { regular: 0.02, uppercase: 0.1 } as const;

/**
 * The quiet label above a group of rows ("Today", "Library"), in the spirit of
 * the web `sidebarSectionLabelClass`: `text-xs` medium (12 / 500), muted, with
 * slightly open letter spacing. The web label is muted at 55% (2.1:1 on the
 * light page); this one is the full muted colour (4.4:1). A header for
 * VoiceOver and TalkBack. No side padding: pass `className="px-4"` to line it
 * up with `ListRow` text. `SettingsSection` titles are the larger heading.
 */
export function SectionLabel({ className, uppercase = false, style, ...props }: SectionLabelProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = largerText ? "text-base" : "text-xs";
  const { fontSize } = sizeStyle(size);
  return (
    <Text
      accessibilityRole="header"
      className={cn("font-instrument-sans-medium", size, className)}
      style={[
        textStyle("muted", scheme),
        sizeStyle(size),
        typeStyle("medium"),
        {
          letterSpacing: fontSize * TRACKING[uppercase ? "uppercase" : "regular"],
          textTransform: uppercase ? "uppercase" : "none",
        },
        style,
      ]}
      {...props}
    />
  );
}
