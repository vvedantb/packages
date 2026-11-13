import type { ReactNode } from "react";
import { ScrollView, Text, View, type TextProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "@vvedantb/native-ui/theme";
import { useScheme } from "./useScheme";

/** Body text in the scheme foreground. */
export function GText({ style, ...props }: TextProps) {
  const scheme = useScheme();
  return <Text style={[{ color: tokens.color.foreground[scheme], fontSize: 15 }, style]} {...props} />;
}

export function Block({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <View className="gap-3" testID={id ? `block-${id}` : undefined}>
      <GText accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600" }}>
        {title}
      </GText>
      {children}
    </View>
  );
}

/** Scrolling page with the safe-area insets and room under the last block. */
export function Page({ children, testID }: { children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  return (
    <ScrollView
      testID={testID}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: tokens.color.background[scheme] }}
      contentContainerStyle={{ gap: 28, padding: 16, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 }}
    >
      {children}
    </ScrollView>
  );
}

export const LONG_TEXT =
  "A long label that keeps going well past one line so that wrapping, truncation and the touch target under it are all exercised on a narrow phone";
