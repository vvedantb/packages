import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { IconArrowLeft, IconArrowRight, IconCheck, IconPencil } from "@tabler/icons-react-native";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Input } from "../Input";
import { sizeStyle, textStyle, typeStyle } from "../controlStyles";
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
}: ChoiceQuestionProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const icon = largerText ? 18 : 15;
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
          // Web `text-[15px] leading-snug`; larger text steps up to 18.
          style={[{ fontSize: largerText ? 18 : 15, lineHeight: largerText ? 24 : 20 }, textStyle("foreground", scheme), typeStyle("semibold")]}
        >
          {question.question}
        </Text>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          {/* Web `text-3xs`: a compact badge beside the question. */}
          {question.header ? (
            <Badge variant="secondary" className="px-2 py-0.5" textClassName={largerText ? "text-sm" : "text-xs"}>
              {question.header}
            </Badge>
          ) : null}
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
            >
              Back
            </Button>
          </View>
        ) : null}
        <View className="flex-1">
          <Button
            disabled={!hasAnswer}
            loading={loading}
            onPress={next}
            endContent={
              loading ? null : <IconArrowRight size={icon} strokeWidth={2.5} color={palette.primaryForeground[scheme]} />
            }
          >
            {isLast ? "Submit" : "Next"}
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
 * One option row (web `Card` with `bg-secondary`, `py-2 px-2.5`, radius 16): a round 24 mark
 * (30 with larger text; letter, or a pencil for "Other"; a check on the primary fill when picked),
 * the label and the description. Picked: a 2-wide primary ring on the accent.
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
  const glyph = largerText ? 16 : 13;
  return (
    <View
      style={{
        // Web `Card` (rounded-surface, 16) with `py-2 px-2.5` inside a 1 border + 1 ring.
        borderRadius: tokens.radius.lg,
        borderWidth: 2,
        borderColor: selected ? palette.primary[scheme] : "transparent",
        backgroundColor: selected ? tokens.color.background[scheme] : palette.default[scheme],
        opacity: disabled ? 0.5 : 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
      }}
    >
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
            <Text className="font-instrument-sans-semibold" style={[typeStyle("semibold"), { fontSize: largerText ? 14 : 11, color: muted, letterSpacing: 0.4 }]}>
              {mark}
            </Text>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-instrument-sans-medium"
            style={[sizeStyle(chatTextSize("small", largerText), "snug"), typeStyle("medium"), { color: selected ? palette.primary[scheme] : muted }]}
          >
            {label}
          </Text>
          {description ? (
            <Text className="font-instrument-sans" style={[sizeStyle(chatTextSize("caption", largerText)), { color: muted, marginTop: 2 }]}>
              {description}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {children}
    </View>
  );
}
