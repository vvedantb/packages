import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
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

/** Space under the form while the keyboard is open, on top of its height. */
const KEYBOARD_EXTRA = 24;

/** The height of the open soft keyboard, or 0. Edge-to-edge Android ignores `adjustResize`, so the screen pads itself. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = (event: { endCoordinates: { height: number } }) => setHeight(event.endCoordinates.height);
    const hide = () => setHeight(0);
    const subs = [
      Keyboard.addListener("keyboardWillShow", show),
      Keyboard.addListener("keyboardDidShow", show),
      Keyboard.addListener("keyboardWillHide", hide),
      Keyboard.addListener("keyboardDidHide", hide),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return height;
}

/**
 * The sign-in and sign-up frame: a keyboard-avoiding scroll view on the
 * background colour, with a title, subtitle and the form in a column of 16.
 * The form is centred until the keyboard opens. Then it aligns to the top and
 * the scroll content gains the keyboard height as bottom space, so the focused
 * field and the submit button scroll above the keyboard.
 */
export function AuthScreen({ title, subtitle, children, header, footer, testID, className }: AuthScreenProps) {
  const scheme = useScheme();
  const keyboardHeight = useKeyboardHeight();
  const keyboardOpen = keyboardHeight > 0;
  return (
    <KeyboardAvoidingView
      // Padding on both platforms, as OverlayModal and PromptInput: Android `height` does nothing edge-to-edge.
      behavior="padding"
      className="flex-1"
      style={{ backgroundColor: tokens.color.background[scheme] }}
    >
      <ScrollView
        testID={testID}
        className="flex-1"
        contentContainerClassName={cn("grow px-6 py-12", keyboardOpen ? "justify-start" : "justify-center", className)}
        contentContainerStyle={keyboardOpen ? { paddingBottom: keyboardHeight + KEYBOARD_EXTRA } : undefined}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
