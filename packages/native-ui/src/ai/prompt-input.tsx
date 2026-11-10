import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconArrowUp, IconPlayerStopFilled } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { fieldStyle, fieldTextStyle, sizeStyle, typeStyle } from "../controlStyles";
import { Input as FieldInput } from "../primitives/input";
import { useControllableState } from "../primitives/use-controllable-state";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";
import { ChatIconButton, type ChatIconButtonProps, type ChatIconButtonSize } from "./icon-button";

/** The `ai` SDK chat status the web `PromptInputSubmit` takes. */
export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

/** Whether the AI is answering: `submitted` (waiting) or `streaming`. */
export function isGenerating(status: ChatStatus | undefined) {
  return status === "submitted" || status === "streaming";
}

export type PromptInputSubmitProps = {
  status?: ChatStatus;
  onSubmit?: () => void;
  onStop?: () => void;
  /** Whether there is something to send. Default `true`. */
  canSubmit?: boolean;
  /** Default `sm` (32). `md` is 36, the `pill` composer's send button. */
  size?: ChatIconButtonSize;
  testID?: string;
};

// The web `PromptInputSubmit` and `PromptInputButton` keep `shape="rounded"`
// (`rounded-lg`, 16) as field addons. At the 32 `icon-sm` size 16 is half the
// side, so the web draws a circle. These stay pills: the same circle at 32, and
// still a circle at 44 with larger text, where 16 would draw a rounded square.

/**
 * Send, or stop while the AI answers: the web `default` `icon-sm` button
 * (32, round, slop to 44). Send is an up arrow on the primary fill, faded by
 * the disabled `Button` with nothing to send, as the web send button. While
 * `status` is `submitted` or `streaming` it is a filled square labelled
 * "Stop" that calls `onStop` (disabled without one).
 */
export function PromptInputSubmit({
  status,
  onSubmit,
  onStop,
  canSubmit = true,
  size,
  testID,
}: PromptInputSubmitProps) {
  if (isGenerating(status)) {
    return (
      <ChatIconButton
        icon={IconPlayerStopFilled}
        label="Stop"
        variant="primary"
        size={size}
        onPress={onStop}
        disabled={!onStop}
        testID={testID}
      />
    );
  }
  return (
    <ChatIconButton
      icon={IconArrowUp}
      label="Send"
      variant="primary"
      size={size}
      onPress={onSubmit}
      disabled={!canSubmit}
      testID={testID}
    />
  );
}

export type PromptInputButtonProps = ChatIconButtonProps;

/** A ghost tool button for the composer `toolbar`, such as attach (web `PromptInputButton`). Give it `icon` and `label`. */
export function PromptInputButton(props: PromptInputButtonProps) {
  return <ChatIconButton variant="ghost" {...props} />;
}

export type PromptInputProps = {
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  /** Called with the trimmed text when Send is pressed. The field then clears. */
  onSubmit: (text: string) => void;
  status?: ChatStatus;
  onStop?: () => void;
  /** Default "What would you like to know?", as on the web. */
  placeholder?: string;
  /** Names the field for VoiceOver and TalkBack. Default "Message". */
  accessibilityLabel?: string;
  /**
   * A pending reply above the field and above `header`: a `ReplyQuoteChip`.
   * Clear it in the app with the chip's `onDismiss`. A `ReplyQuoteChip` as
   * `header` works as well, beside any attachments.
   */
  replyTo?: ReactNode;
  /** Above the field, such as `Attachments`. */
  header?: ReactNode;
  /** Before the send button, such as `PromptInputButton`s. */
  toolbar?: ReactNode;
  /**
   * `stacked` (default): the field over a footer of tools and send, the web
   * `PromptInput`. `inline`: one row, as the web `Composer layout="inline"`
   * (Eva's chat): `leading`, the field, `toolbar`, then send, in a 20-radius
   * field with `p-1.5`, 44 high on one line.
   */
  layout?: "stacked" | "inline";
  /**
   * `inline` only. `rounded` (default): the web `Composer` field, radius 20.
   * `pill`: Eva's web chat composer (`h-12 rounded-full py-1`): 48 high on one
   * line, a 36 send button and a `text-sm` (14 / 20) field 36 high; it keeps
   * radius 24 as it grows. Give the + a filled `variant="secondary"`, as Eva.
   */
  shape?: "rounded" | "pill";
  /** `inline` only: before the field, such as a + (attach) `PromptInputButton`. */
  leading?: ReactNode;
  disabled?: boolean;
  /** Pad the bottom safe-area inset (home indicator). Default `true`; turn it off when a tab bar below already does. */
  safeBottom?: boolean;
  /** Height of anything above the screen's own top, such as a navigation header, for the `KeyboardAvoidingView`. Default 0. */
  keyboardVerticalOffset?: number;
  className?: string;
  testID?: string;
};

/** The web `Composer` inline radius, `rounded-[1.25rem]`. */
const INLINE_RADIUS = 20;

/**
 * Eva's `pill` composer: 48 high on one line (border 1, then 5 around a 36
 * field: the web `h-12 py-1` centres the 36 field and send button in 38),
 * `pl-1.5` / `pr-1.5`, and radius 24 (`rounded-full` at 48).
 */
const PILL = { radius: 24, paddingY: 5, paddingX: 6, lineHeight: 36 } as const;

/** The field grows to this height, then scrolls: about 6 lines of 24 (with `py-2.5`), and about 8 of `text-xl` with larger text. */
const MAX_FIELD_HEIGHT = { regular: 160, larger: 240 } as const;

/**
 * React Native Web draws a multiline field as a `textarea` with the HTML
 * default of 2 rows, and the auto-grow keeps that height. One row there; on
 * native, `numberOfLines` would lock the line count on Android, so none.
 */
const ONE_ROW = Platform.OS === "web" ? 1 : undefined;

/**
 * The chat composer: the web `PromptInput` field (`rounded-field border
 * bg-field-background`, `fieldStyle`) with an optional `header` row, a
 * multiline field that grows from one line, and a footer of `toolbar` tools
 * and the send / stop button. It sits in a `KeyboardAvoidingView` (padding,
 * on iOS and Android) and pads the safe-area insets, so put it last in a
 * full-height column, under the `Conversation`.
 */
export function PromptInput({
  value,
  defaultValue = "",
  onChangeText,
  onSubmit,
  status,
  onStop,
  placeholder = "What would you like to know?",
  accessibilityLabel = "Message",
  replyTo,
  header,
  toolbar,
  layout = "stacked",
  shape = "rounded",
  leading,
  disabled = false,
  safeBottom = true,
  keyboardVerticalOffset = 0,
  className,
  testID,
}: PromptInputProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const insets = useSafeAreaInsets();
  const [text, setText] = useControllableState({ value, defaultValue, onChange: onChangeText });
  const message = text.trim();
  const canSubmit = message.length > 0 && !disabled && !isGenerating(status);
  const bottom = safeBottom ? insets.bottom : 0;
  // The field grows with its content up to `maxHeight`, then scrolls. A fixed
  // `numberOfLines` would lock the line count on Android, so neither layout sets it.
  const [contentHeight, setContentHeight] = useState(0);
  const maxHeight = largerText ? MAX_FIELD_HEIGHT.larger : MAX_FIELD_HEIGHT.regular;
  const growStyle = contentHeight > 0 ? { height: Math.min(contentHeight, maxHeight) } : null;
  const scrollEnabled = contentHeight > maxHeight;
  const pill = layout === "inline" && shape === "pill";
  // Inline: the web `Composer` `text-sm leading-6` (Eva's pill: `leading-5`).
  // Stacked: the web `PromptInput` `Textarea`, `text-base` below `sm`. Larger text is `text-xl`.
  const fieldText = largerText
    ? sizeStyle("text-xl")
    : layout === "inline"
      ? { fontSize: 14, lineHeight: pill ? 20 : 24 }
      : sizeStyle("text-base");

  // An empty field drops its measured height and is one line again: on the web
  // a `textarea` only reports a taller height, never a shorter one.
  const changeText = (next: string) => {
    setText(next);
    if (next === "") setContentHeight(0);
  };

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(message);
    setText("");
    setContentHeight(0);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      // The keyboard covers the home indicator, so the inset padded below is
      // taken off the lift: the composer sits right on the keyboard.
      keyboardVerticalOffset={keyboardVerticalOffset - bottom}
    >
      <View
        testID={testID}
        className={cn("pt-2", className)}
        style={{ paddingBottom: bottom + 8, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }}
      >
        {layout === "inline" ? (
          // Web `Composer` inline: `rounded-[1.25rem]` and a `p-1.5` row, items at the bottom as the field grows.
          <View className="border" style={[fieldStyle(scheme), { borderRadius: pill ? PILL.radius : INLINE_RADIUS }]}>
            {replyTo ? <View className="px-1.5 pt-1.5">{replyTo}</View> : null}
            {header ? <View className="flex-row flex-wrap gap-1 px-1.5 pt-1.5">{header}</View> : null}
            <View
              className={cn("flex-row items-end gap-1", !pill && "p-1.5")}
              style={pill ? { paddingVertical: PILL.paddingY, paddingHorizontal: PILL.paddingX } : null}
            >
              {leading ? (
                // In the pill, centred on the 36 line, as the web `items-center` row.
                <View className="shrink-0 flex-row items-center gap-1" style={pill ? { minHeight: PILL.lineHeight } : null}>
                  {leading}
                </View>
              ) : null}
              <FieldInput
                multiline
                numberOfLines={ONE_ROW}
                value={text}
                onChangeText={changeText}
                placeholder={placeholder}
                accessibilityLabel={accessibilityLabel}
                editable={!disabled}
                textAlignVertical="center"
                scrollEnabled={scrollEnabled}
                onContentSizeChange={(e) => setContentHeight(e.nativeEvent.contentSize.height)}
                className={cn(
                  "flex-1 border-0 text-sm font-instrument-sans",
                  pill ? "min-h-9 px-1 py-2" : "min-h-8 px-2 py-1",
                  largerText && "min-h-11 py-2 text-xl font-instrument-sans-medium",
                )}
                style={[
                  fieldTextStyle(scheme),
                  fieldText,
                  largerText ? typeStyle("medium") : null,
                  {
                    backgroundColor: "transparent",
                    maxHeight,
                    ...growStyle,
                  },
                ]}
              />
              <View className="shrink-0 flex-row items-center gap-1" style={pill ? { minHeight: PILL.lineHeight } : null}>
                {toolbar}
                <PromptInputSubmit
                  status={status}
                  onSubmit={submit}
                  onStop={onStop}
                  canSubmit={canSubmit}
                  size={pill ? "md" : undefined}
                />
              </View>
            </View>
          </View>
        ) : (
          <View className="border" style={fieldStyle(scheme)}>
            {replyTo ? <View className="px-2 pt-2">{replyTo}</View> : null}
            {header ? <View className="flex-row flex-wrap gap-1 px-2 pt-2">{header}</View> : null}
            {/* The `Textarea` field without its `numberOfLines` (default 4), which on Android sets the line count: this one starts at one line and grows. */}
            <FieldInput
              multiline
              numberOfLines={ONE_ROW}
              value={text}
              onChangeText={changeText}
              placeholder={placeholder}
              accessibilityLabel={accessibilityLabel}
              editable={!disabled}
              textAlignVertical="top"
              scrollEnabled={scrollEnabled}
              onContentSizeChange={(e) => setContentHeight(e.nativeEvent.contentSize.height)}
              className={cn(
                "min-h-11 border-0 px-3.5 py-2.5 text-base font-instrument-sans",
                largerText && "min-h-14 px-4 py-3 text-xl font-instrument-sans-medium",
              )}
              style={[
                fieldTextStyle(scheme),
                fieldText,
                largerText ? typeStyle("medium") : null,
                {
                  backgroundColor: "transparent",
                  maxHeight,
                  ...growStyle,
                },
              ]}
            />
            <View className="flex-row items-center justify-between gap-1 px-2 pb-2">
              <View className="min-w-0 shrink flex-row items-center gap-1">{toolbar}</View>
              <PromptInputSubmit status={status} onSubmit={submit} onStop={onStop} canSubmit={canSubmit} />
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
