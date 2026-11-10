import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { IconArrowLeft, IconArrowRight, IconCheck, IconPencil } from "@tabler/icons-react-native";
import { Button } from "../Button";
import { Input } from "../Input";
import { buttonColors, sizeStyle, textStyle, trackingStyle, typeStyle } from "../controlStyles";
import { palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";

/** One question, as an agent's AskUserQuestion sends it. */
export type ChoiceQuestionItem = {
  question: string;
  /** Short tag shown as a badge beside the question. */
  header: string;
  multiSelect: boolean;
  options: ReadonlyArray<{ label: string; description: string }>;
};

export type ChoiceQuestionProps = {
  questions: ReadonlyArray<ChoiceQuestionItem>;
  /**
   * Question text to the picked label, or the typed "Other" answer.
   * Multi-select joins labels with ", " (the shape AskUserQuestion reads).
   */
  onSubmit: (answers: Record<string, string>) => void | Promise<void>;
  /** Shows a spinner on the submit button and blocks input. */
  loading?: boolean;
  /** Default "Other...". */
  otherLabel?: string;
  /** Default "Type your answer...". */
  otherPlaceholder?: string;
  /** Inside the web dock card (`rounded-surface bg-card p-3`, scrolling past 60% of the screen). Default `true`. */
  framed?: boolean;
  /**
   * Back, Next and Submit label weight. Default `medium`, the `Button` label
   * (web `font-medium`). `semibold` for apps whose web buttons are semibold, as Eva.
   */
  buttonWeight?: "medium" | "semibold";
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The structured answer for `onSubmit`. Exported for tests. */
export function choiceAnswers(
  questions: ReadonlyArray<ChoiceQuestionItem>,
  picked: Readonly<Record<number, readonly string[]>>,
  other: Readonly<Record<number, string>>,
  otherOn: Readonly<Record<number, boolean>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  questions.forEach((question, index) => {
    if (otherOn[index]) {
      result[question.question] = (other[index] ?? "").trim();
      return;
    }
    const selected = picked[index] ?? [];
    result[question.question] = question.multiSelect ? selected.join(", ") : (selected[0] ?? "");
  });
  return result;
}

/**
 * An agent's blocking multiple-choice question, as the web chat's question
 * dock (`ChatQuestionDock` + `MultipleChoiceQuestion`): the question with its
 * header badge and step count, lettered option rows with descriptions, an
 * "Other..." row that opens a text field, then Back and Next or Submit. One
 * question at a time.
 */
export function ChoiceQuestion({
  questions,
  onSubmit,
  loading = false,
  otherLabel = "Other...",
  otherPlaceholder = "Type your answer...",
  framed = true,
  buttonWeight = "medium",
}: ChoiceQuestionProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const icon = largerText ? 18 : 15;
  const buttonText = largerText ? "text-xl" : "text-sm";
  // A string child draws the `Button` medium label; a semibold one is drawn here, in the variant's label colour.
  const buttonLabel = (text: string, variant: "primary" | "ghost") =>
    buttonWeight === "medium" ? (
      text
    ) : (
      <Text
        className={`${buttonText} font-instrument-sans-semibold`}
        style={[sizeStyle(buttonText), typeStyle("semibold"), { color: buttonColors(variant, scheme)?.color }]}
      >
        {text}
      </Text>
    );
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<number, string[]>>({});
  const [other, setOther] = useState<Record<number, string>>({});
  const [otherOn, setOtherOn] = useState<Record<number, boolean>>({});
  const question = questions[step];
  if (!question) return null;

  const total = questions.length;
  const isLast = step === total - 1;
  const selected = picked[step] ?? [];
  const hasAnswer = otherOn[step] ? (other[step] ?? "").trim() !== "" : selected.length > 0;

  const toggle = (label: string) => {
    const next = question.multiSelect
      ? selected.includes(label)
        ? selected.filter((item) => item !== label)
        : [...selected, label]
      : [label];
    setPicked({ ...picked, [step]: next });
    setOtherOn({ ...otherOn, [step]: false });
  };

  const next = () => {
    if (!hasAnswer || loading) return;
    if (isLast) void onSubmit(choiceAnswers(questions, picked, other, otherOn));
    else setStep(step + 1);
  };

  const body = (
    <View style={{ gap: 16 }}>
      <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
        <Text
          className="flex-1 font-instrument-sans-semibold"
          // Web `text-[15px] leading-snug` (15 / 20.625); larger text steps up to 18.
          style={[{ fontSize: largerText ? 18 : 15, lineHeight: largerText ? 24 : 15 * 1.375 }, textStyle("foreground", scheme), typeStyle("semibold")]}
        >
          {question.question}
        </Text>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          {question.header ? <TopicBadge>{question.header}</TopicBadge> : null}
          {total > 1 ? (
            <Text className="font-instrument-sans-medium" style={[sizeStyle(chatTextSize("caption", largerText)), textStyle("muted", scheme), typeStyle("medium")]}>
              {`${step + 1}/${total}`}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        {question.options.map((option, index) => (
          <ChoiceRow
            key={`${option.label}-${index}`}
            selected={!otherOn[step] && selected.includes(option.label)}
            disabled={loading}
            mark={LETTERS[index] ?? String(index + 1)}
            label={option.label}
            description={option.description}
            onPress={() => toggle(option.label)}
          />
        ))}
        <ChoiceRow
          selected={otherOn[step] ?? false}
          disabled={loading}
          mark="other"
          label={otherLabel}
          onPress={() => {
            setOtherOn({ ...otherOn, [step]: true });
            setPicked({ ...picked, [step]: [] });
          }}
        >
          {otherOn[step] ? (
            <View style={{ marginTop: 8, marginLeft: 36 }}>
              <Input
                value={other[step] ?? ""}
                onChangeText={(text: string) => setOther({ ...other, [step]: text })}
                placeholder={otherPlaceholder}
                editable={!loading}
                autoFocus
                onSubmitEditing={next}
              />
            </View>
          ) : null}
        </ChoiceRow>
      </View>

      <View className="flex-row items-center" style={{ gap: 8 }}>
        {total > 1 && step > 0 ? (
          <View className="flex-1">
            <Button
              variant="ghost"
              disabled={loading}
              onPress={() => setStep(step - 1)}
              startContent={<IconArrowLeft size={icon} strokeWidth={2.5} color={tokens.color.foreground[scheme]} />}
              accessibilityLabel="Back"
            >
              {buttonLabel("Back", "ghost")}
            </Button>
          </View>
        ) : null}
        <View className="flex-1">
          <Button
            disabled={!hasAnswer}
            loading={loading}
            onPress={next}
            accessibilityLabel={isLast ? "Submit" : "Next"}
            endContent={
              loading ? null : <IconArrowRight size={icon} strokeWidth={2.5} color={palette.primaryForeground[scheme]} />
            }
          >
            {buttonLabel(isLast ? "Submit" : "Next", "primary")}
          </Button>
        </View>
      </View>
    </View>
  );

  if (!framed) return body;
  return (
    <View style={{ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.surface[scheme], overflow: "hidden" }}>
      <ScrollView style={{ maxHeight: 544 }} contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
    </View>
  );
}

/**
 * The question's topic, the web `Badge variant="secondary"` with Eva's
 * `text-3xs font-semibold` (10 / 14, 600) in a `px-2.5 py-0.5` pill. Drawn here
 * because `Badge` sets its own size and weight.
 */
function TopicBadge({ children }: { children: string }) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const fontSize = largerText ? 14 : 10;
  return (
    <View
      className="rounded-full px-2.5 py-0.5"
      style={{ backgroundColor: palette.default[scheme], borderRadius: tokens.radius.pill }}
    >
      <Text
        numberOfLines={1}
        className="font-instrument-sans-semibold"
        style={[
          { fontSize, lineHeight: largerText ? 20 : 14, color: palette.defaultForeground[scheme] },
          typeStyle("semibold"),
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * One option row (web `Card` with `bg-secondary`, `py-2 px-2.5`, radius 16): a round 24 mark
 * (30 with larger text; letter, or a pencil for "Other"; a check on the primary fill when picked),
 * the label and the description. Picked: a 1-wide primary ring outside, on the accent.
 */
function ChoiceRow({
  selected,
  disabled,
  mark,
  label,
  description,
  onPress,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  mark: string;
  label: string;
  description?: string;
  onPress: () => void;
  children?: ReactNode;
}) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const muted = tokens.color.muted[scheme];
  const markSize = largerText ? 30 : 24;
  const markText = largerText ? 14 : 11;
  const glyph = largerText ? 16 : 13;
  const small = chatTextSize("small", largerText);
  // Web: an option label is `text-sm leading-snug font-medium`; "Other..." is
  // plain `text-sm`, medium only once picked.
  const plain = mark === "other" && !selected;
  // The web label is an inline `leading-snug` span in a 16 / 24 block, so each
  // line box is the block's 24, not 19.25: rows are 24 a line, as on the web.
  const labelLine = largerText ? sizeStyle(small, "snug") : { ...sizeStyle(small, "snug"), lineHeight: 24 };
  return (
    <View
      style={{
        // Web `Card` (rounded-surface, 16) with `py-2 px-2.5` and no border width.
        borderRadius: tokens.radius.lg,
        backgroundColor: selected ? tokens.color.background[scheme] : palette.default[scheme],
        opacity: disabled ? 0.5 : 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
      }}
    >
      {selected ? (
        // Web `ring-1 ring-primary`: a 1 line just outside the card, so picking a row moves nothing.
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -1,
            left: -1,
            right: -1,
            bottom: -1,
            borderRadius: tokens.radius.lg + 1,
            borderWidth: 1,
            borderColor: palette.primary[scheme],
          }}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={4}
        className="flex-row"
        style={{ gap: 12, alignItems: description ? "flex-start" : "center" }}
      >
        <View
          style={{
            width: markSize,
            height: markSize,
            // Web `rounded-md` (radius - 2 = 14 at the default 1rem) on a 24 box: round.
            borderRadius: markSize / 2,
            marginTop: description ? 2 : 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selected ? palette.primary[scheme] : palette.default[scheme],
          }}
        >
          {selected ? (
            <IconCheck size={glyph} strokeWidth={3} color={palette.primaryForeground[scheme]} />
          ) : mark === "other" ? (
            <IconPencil size={glyph} color={muted} />
          ) : (
            // Web `text-2xs font-bold tracking-wide`, at semibold: native-ui draws no bold face.
            <Text
              className="font-instrument-sans-semibold"
              style={[
                { fontSize: markText, lineHeight: largerText ? 20 : 16, color: muted },
                trackingStyle(markText, "wide"),
                typeStyle("semibold"),
              ]}
            >
              {mark}
            </Text>
          )}
        </View>
        <View className="min-w-0 flex-1">
          {plain ? (
            <Text className="font-instrument-sans" style={[sizeStyle(small), { color: muted }]}>
              {label}
            </Text>
          ) : (
            <Text
              className="font-instrument-sans-medium"
              style={[labelLine, typeStyle("medium"), { color: selected ? palette.primary[scheme] : muted }]}
            >
              {label}
            </Text>
          )}
          {description ? (
            // Web `text-xs mt-0.5 leading-relaxed` (12 / 19.5).
            <Text
              className="font-instrument-sans"
              style={[sizeStyle(chatTextSize("caption", largerText), "relaxed"), { color: muted, marginTop: 2 }]}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {children}
    </View>
  );
}
