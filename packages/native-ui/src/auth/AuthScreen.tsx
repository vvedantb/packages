import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { cn } from "../cn";
import { textStyle, typeStyle } from "../controlStyles";
import { palette } from "../palette";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";

export type AuthScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Above the title, such as an app mark. App brand chrome goes here. */
  header?: ReactNode;
  /** Below the form, such as the "Don't have an account?" row. */
  footer?: ReactNode;
  testID?: string;
  className?: string;
};

/**
 * The sign-in and sign-up frame: a keyboard-avoiding scroll view on the
 * background colour, with a title, subtitle and the form in a column of 16.
 */
export function AuthScreen({ title, subtitle, children, header, footer, testID, className }: AuthScreenProps) {
  const scheme = useScheme();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ backgroundColor: tokens.color.background[scheme] }}
    >
      <ScrollView
        testID={testID}
        className="flex-1"
        contentContainerClassName={cn("grow justify-center px-6 py-12", className)}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-sm self-center gap-6">
          {header}
          <View className="gap-2">
            <Text
              accessibilityRole="header"
              className="font-instrument-sans-semibold text-2xl"
              style={[textStyle("foreground", scheme), typeStyle("semibold")]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="font-instrument-sans text-base" style={textStyle("muted", scheme)}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View className="gap-4">{children}</View>
          {footer ? <View className="flex-row flex-wrap items-center justify-center gap-1">{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A separator, "or", a separator: between Google and the email fields. */
export function OrDivider({ label = "or" }: { label?: string }) {
  const scheme = useScheme();
  const line = { height: StyleSheet.hairlineWidth, backgroundColor: tokens.color.separator[scheme] };
  return (
    <View
      className="flex-row items-center gap-3"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View className="flex-1" style={line} />
      <Text className="font-instrument-sans text-sm" style={textStyle("muted", scheme)}>
        {label}
      </Text>
      <View className="flex-1" style={line} />
    </View>
  );
}

/** An inline error under a form, read out when it appears. Nothing without a message. */
export function FieldError({ message, testID }: { message?: string | null; testID?: string }) {
  const scheme = useScheme();
  if (!message) return null;
  return (
    <Text
      testID={testID}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="font-instrument-sans text-sm"
      style={{ color: palette.danger[scheme] }}
    >
      {message}
    </Text>
  );
}
