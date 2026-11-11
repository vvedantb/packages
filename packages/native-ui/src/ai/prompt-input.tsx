import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconArrowUp, IconChevronDown, IconPlayerStopFilled } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { MIN_TOUCH_TARGET, fieldStyle, fieldTextStyle, sizeStyle, touchSlop, typeStyle } from "../controlStyles";
import { withAlpha } from "../palette";
import { tokens } from "../tokens";
import { Input as FieldInput } from "../primitives/input";
import { usePressFeedback } from "../motion";
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

/**
 * The web `ModelPicker` trigger (`model-picker.tsx` `TRIGGER_CLASS`), the
 * chip a composer footer holds: `h-7 gap-1.5 rounded-md px-2 text-xs`, a 14
 * icon, the suffix at `/70` after " · ", and a 12 chevron at `opacity-60`.
 */
export const PROMPT_INPUT_CHIP = {
  height: 28,
  paddingX: 8,
  gap: 6,
  radius: tokens.radius.md,
  iconSize: 14,
  chevronSize: 12,
  chevronOpacity: 0.6,
  suffixOpacity: 0.7,
  /** The narrowest label worth drawing: about two characters and the ellipsis at `text-xs` (2em). */
  labelMinWidth: 24,
} as const;

export type PromptInputChipProps = {
  /** Before the label: a `PROMPT_INPUT_CHIP.iconSize` (14) mark, such as `ProviderIcon` or a Tabler icon. */
  icon?: ReactNode;
  label: string;
  /** After the label, " · " between, at 70% of `color`: the web trigger suffix (the reasoning level). */
  suffix?: string;
  /** After the label in medium weight with tabular figures, such as a saved count. */
  count?: number;
  /** The chevron after the label. Default `true`. */
  chevron?: boolean;
  /** Label weight. Default `medium`, the web trigger; a quieter footer passes `normal`. */
  weight?: "normal" | "medium";
  /** Text, chevron and Tabler icon colour. Default `tokens.color.muted`, the web `text-muted-foreground`. */
  color?: string;
  /** Default: the label, then the suffix and count. */
  accessibilityLabel?: string;
  /** Whether the menu it opens is open, for VoiceOver and TalkBack. */
  expanded?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
};

/**
 * A chip for the composer `footer`, the web `ModelPicker` trigger: 28 high on
 * screen, slop to 44 above and below. The label shrinks and truncates, so a
 * long model name gives up width to the chips beside it, as the web
 * `max-sm:truncate`; the icon and chevron keep their size. Below
 * `labelMinWidth` (scaled by the system font size) the label hides, so a
 * squeezed chip is its icon and chevron, as the web at 390, not a sliver of a
 * letter. Disabled dims to 50%, as the web `disabled:opacity-50`.
 */
export function PromptInputChip({
  icon,
  label,
  suffix,
  count,
  chevron = true,
  weight = "medium",
  color,
  accessibilityLabel,
  expanded,
  disabled = false,
  onPress,
  testID,
}: PromptInputChipProps) {
  const scheme = useScheme();
  const pressed = usePressFeedback();
  const { fontScale } = useWindowDimensions();
  // Whether the label slot is wide enough to read. Hiding it only sets the
  // opacity, so the layout and the next `onLayout` width stay the same: the
  // state changes once per threshold crossing, never in a layout loop, and a
  // wider slot later shows the label again.
  const [readable, setReadable] = useState(true);
  const tint = color ?? tokens.color.muted[scheme];
  const text = [sizeStyle("text-xs"), { color: tint }];
  const name = accessibilityLabel ?? [label, suffix, count].filter((part) => part !== undefined).join(", ");
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      // Slop only above and below: chips sit side by side, so the width stays theirs.
      hitSlop={touchSlop(MIN_TOUCH_TARGET, PROMPT_INPUT_CHIP.height)}
      className={cn("min-w-0 shrink flex-row items-center", pressed, disabled && "opacity-50")}
      // `minHeight`, so a larger system font size can still grow it.
      style={{
        minHeight: PROMPT_INPUT_CHIP.height,
        paddingHorizontal: PROMPT_INPUT_CHIP.paddingX,
        gap: PROMPT_INPUT_CHIP.gap,
        borderRadius: PROMPT_INPUT_CHIP.radius,
      }}
    >
      {/* Held whole: in a squeezed chip only the label gives up width. */}
      {icon ? <View className="shrink-0">{icon}</View> : null}
      <Text
        numberOfLines={1}
        onLayout={(event) =>
          setReadable(event.nativeEvent.layout.width >= PROMPT_INPUT_CHIP.labelMinWidth * Math.max(1, fontScale))
        }
        className={cn("min-w-0 shrink text-xs", weight === "medium" ? "font-instrument-sans-medium" : "font-instrument-sans")}
        style={[...text, weight === "medium" ? typeStyle("medium") : null, readable ? null : { opacity: 0 }]}
      >
        {label}
        {suffix ? <Text style={{ color: withAlpha(tint, PROMPT_INPUT_CHIP.suffixOpacity) }}>{` · ${suffix}`}</Text> : null}
      </Text>
      {count !== undefined ? (
        <Text
          className="font-instrument-sans-medium text-xs"
          style={[...text, typeStyle("medium"), { fontVariant: ["tabular-nums"] }]}
        >
          {count}
        </Text>
      ) : null}
      {chevron ? (
        <View style={{ opacity: PROMPT_INPUT_CHIP.chevronOpacity }}>
          <IconChevronDown size={PROMPT_INPUT_CHIP.chevronSize} color={tint} />
        </View>
      ) : null}
    </Pressable>
  );
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
   * Under the field, inside the keyboard lift and above the bottom inset: a
   * row of `PromptInputChip`s, as the bar under Eva's web composer.
   */
  footer?: ReactNode;
  /**
   * Right above the field, the field's width and 6 clear of it, inside the
   * keyboard lift: a `PromptInputMenu`, the web `@` / `/` picker. Pass it only
   * while the picker is open.
   */
  menu?: ReactNode;
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
 * `pl-1.5` / `pr-1.5`, and radius 24 (`rounded-full` at 48). Its placeholder
 * is the muted colour at 90% (`data-empty:before:text-muted-foreground/90`).
 */
const PILL = { radius: 24, paddingY: 5, paddingX: 6, lineHeight: 36, placeholderAlpha: 0.9 } as const;

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
  footer,
  menu,
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
        {/* The web panel picker's 6 gap (`POPUP_GAP`) above the field. */}
        {menu ? <View className="mb-1.5">{menu}</View> : null}
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
                placeholderTextColor={pill ? withAlpha(tokens.color.muted[scheme], PILL.placeholderAlpha) : undefined}
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
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}
