import { Text, View } from "react-native";
import { IconCheck, IconMessageQuestion, IconPencil } from "@tabler/icons-react-native";
import { sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import type { ActivityQuestion } from "./activity-step-types";
import { chatTextSize } from "./chat-text";
import { TopicBadge } from "./choice-question";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * The offered labels the user picked. A whole-answer match wins first, so a
 * single-select label holding ", " is not read as several picks; only a
 * multi-select answer is split on the ", " the dock joins it with.
 */
export function selectedLabels(answer: string | undefined, question: ActivityQuestion): string[] {
  if (answer === undefined) return [];
  const offered = new Set(question.options.map((option) => option.label));
  if (offered.has(answer)) return [answer];
  if (!question.multiSelect) return [];
  return answer.split(", ").filter((label) => offered.has(label));
}

/** Free text typed into "Other": an answer that matches no offered label. */
export function freeTextAnswer(answer: string | undefined, chosen: readonly string[]): string | null {
  if (answer === undefined || answer.trim().length === 0) return null;
  return chosen.length > 0 ? null : answer;
}

export type ActivityQuestionCardProps = {
  /** The prompt's questions, as the agent asked them. */
  questions: ActivityQuestion[];
  /** The answers, keyed by question text (`ChoiceQuestion`'s `onSubmit` shape). */
  answers?: Record<string, string>;
};

/**
 * The read-only record of an AskUserQuestion prompt and the answer given, as
 * the web `ActivityQuestionCard`: "Question(s)" over each question with its
 * topic badge, its lettered options with the picked ones filled and checked,
 * the free "Other" text with a pencil, and "Answered in the next message" when
 * no structured answer was kept. The live prompt is `ChoiceQuestion`; this is
 * what the transcript keeps once it is answered. Nothing here is pressable.
 */
export function ActivityQuestionCard({ questions, answers }: ActivityQuestionCardProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  if (questions.length === 0) return null;
  const caption = chatTextSize("caption", largerText);
  const small = chatTextSize("small", largerText);
  const title = questions.length > 1 ? "Questions" : "Question";
  return (
    <View
      accessibilityLabel={title}
      style={{ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.surface[scheme], padding: 12, gap: 12 }}
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <IconMessageQuestion size={largerText ? 18 : 14} color={tokens.color.muted[scheme]} />
        <Text className="font-instrument-sans-medium" style={[sizeStyle(caption), textStyle("muted", scheme), typeStyle("medium")]}>
          {title}
        </Text>
      </View>
      {questions.map((question, questionIndex) => {
        const answer = answers?.[question.question];
        const chosen = selectedLabels(answer, question);
        const freeText = freeTextAnswer(answer, chosen);
        const answered = answer !== undefined && answer.trim().length > 0;
        return (
          <View key={`${question.question}-${questionIndex}`} style={{ gap: 6 }}>
            <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
              <Text
                className="min-w-0 flex-1 font-instrument-sans-medium"
                style={[sizeStyle(small), textStyle("foreground", scheme), typeStyle("medium")]}
              >
                {question.question}
              </Text>
              {question.header ? <TopicBadge>{question.header}</TopicBadge> : null}
            </View>
            <View style={{ gap: 2 }}>
              {question.options.map((option, optionIndex) => (
                <RecordRow
                  key={`${option.label}-${optionIndex}`}
                  mark={chosen.includes(option.label) ? "check" : (LETTERS[optionIndex] ?? String(optionIndex + 1))}
                  label={option.label}
                  description={option.description}
                  selected={chosen.includes(option.label)}
                />
              ))}
              {freeText ? <RecordRow mark="other" label="Other" description={freeText} selected /> : null}
            </View>
            {answered ? null : (
              <Text className="font-instrument-sans" style={[sizeStyle(caption), textStyle("muted", scheme)]}>
                Answered in the next message
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * One option as recorded (web `OptionRow`): a 20 rounded mark (the letter, a
 * check when picked, a pencil for "Other"), the label and its description.
 * Picked: the row on the tertiary fill, the mark on primary, the label medium.
 */
function RecordRow({
  mark,
  label,
  description,
  selected,
}: {
  mark: string;
  label: string;
  description?: string;
  selected: boolean;
}) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const caption = chatTextSize("caption", largerText);
  const small = chatTextSize("small", largerText);
  const markSize = largerText ? 26 : 20;
  const markColor = selected ? palette.primaryForeground[scheme] : tokens.color.muted[scheme];
  const glyph = largerText ? 15 : 12;
  return (
    <View
      accessibilityLabel={selected ? `${label}, chosen` : label}
      accessibilityHint={description || undefined}
      className="flex-row items-start"
      style={{
        gap: 8,
        borderRadius: tokens.radius.md,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: selected ? palette.surfaceTertiary[scheme] : "transparent",
      }}
    >
      <View
        style={{
          width: markSize,
          height: markSize,
          marginTop: 2,
          // A small rounded square, as the web `rounded-md` mark.
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? palette.primary[scheme] : palette.default[scheme],
        }}
      >
        {mark === "check" ? (
          <IconCheck size={glyph} strokeWidth={3} color={markColor} />
        ) : mark === "other" ? (
          <IconPencil size={glyph} strokeWidth={3} color={markColor} />
        ) : (
          <Text className="font-instrument-sans-semibold" style={[{ fontSize: largerText ? 13 : 10, color: markColor }, typeStyle("semibold")]}>
            {mark}
          </Text>
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className={selected ? "font-instrument-sans-medium" : "font-instrument-sans"}
          style={[sizeStyle(small, "snug"), textStyle(selected ? "foreground" : "muted", scheme), selected ? typeStyle("medium") : null]}
        >
          {label}
        </Text>
        {description ? (
          <Text className="font-instrument-sans" style={[sizeStyle(caption), textStyle("muted", scheme), { marginTop: 2 }]}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
