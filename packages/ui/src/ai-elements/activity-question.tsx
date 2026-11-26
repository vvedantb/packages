import type { ReactNode } from "react";
import {
  IconCheck,
  IconMessageQuestion,
  IconPencil,
} from "@tabler/icons-react";

import { Badge } from "../ui/badge";
import { useCn, useUiConfig } from "../ui/ui-config";
import { freeTextAnswer, selectedLabels } from "./activity-question-utils";
import type { ActivityQuestion } from "./activity-shared";

/**
 * `UiConfig.ActivityQuestionCard`: `classes.selectedOption` replaces the fill
 * of the picked option row (default `bg-surface-tertiary`).
 */
export interface ActivityQuestionCardConfig {
  classes?: { selectedOption?: string };
}

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const CHIP_CLASS =
  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-3xs font-medium tracking-wide";

function OptionRow({
  chip,
  label,
  description,
  isSelected,
}: {
  chip: ReactNode;
  label: string;
  description?: string;
  isSelected: boolean;
}) {
  const merge = useCn();
  const selectedClass =
    useUiConfig("ActivityQuestionCard")?.classes?.selectedOption ?? "bg-surface-tertiary";
  return (
    <div
      className={merge(
        "flex items-start gap-2 rounded-md px-2 py-1.5",
        isSelected ? selectedClass : undefined,
      )}
    >
      <span
        className={merge(
          CHIP_CLASS,
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground",
        )}
      >
        {chip}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={merge(
            "text-sm leading-snug",
            isSelected
              ? "font-medium text-foreground"
              : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Read-only record of an AskUserQuestion prompt and the answer given. The live
 * prompt is `MultipleChoiceQuestion` in the composer dock; this is the history
 * left behind in the transcript once the question is answered.
 *
 * `headerAction` renders at the right end of the "Question" header row, for
 * controls such as a pager when the caller shows one question at a time.
 */
export function ActivityQuestionCard({
  questions,
  answers,
  headerAction,
}: {
  questions: ActivityQuestion[];
  answers?: Record<string, string>;
  headerAction?: ReactNode;
}) {
  const merge = useCn();
  if (questions.length === 0) return null;

  return (
    <div className="rounded-surface bg-card p-3 space-y-3">
      <div
        className={merge(
          "flex items-center justify-between gap-2",
          // The action row's 28px buttons set the height, so the header keeps
          // clear of the question text below.
          headerAction ? "min-h-7" : undefined,
        )}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <IconMessageQuestion size={14} />
          {questions.length > 1 ? "Questions" : "Question"}
        </div>
        {headerAction ? (
          <div className="flex shrink-0 items-center gap-1">{headerAction}</div>
        ) : null}
      </div>
      {questions.map((question, questionIndex) => {
        const answer = answers?.[question.question];
        const hasAnswer = answer !== undefined && answer.trim().length > 0;
        const chosen = selectedLabels(answer, question);
        const freeText = freeTextAnswer(answer, chosen);
        return (
          <div
            key={`${question.question}-${questionIndex}`}
            className="space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {question.question}
              </p>
              {question.header ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 text-3xs font-medium"
                >
                  {question.header}
                </Badge>
              ) : null}
            </div>
            <div className="space-y-0.5">
              {question.options.map((option, optionIndex) => {
                const isSelected = chosen.includes(option.label);
                return (
                  <OptionRow
                    key={`${option.label}-${optionIndex}`}
                    chip={
                      isSelected ? (
                        <IconCheck size={12} strokeWidth={3} />
                      ) : (
                        (OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1))
                      )
                    }
                    label={option.label}
                    description={option.description}
                    isSelected={isSelected}
                  />
                );
              })}
              {freeText ? (
                <OptionRow
                  chip={<IconPencil size={12} strokeWidth={3} />}
                  label="Other"
                  description={freeText}
                  isSelected
                />
              ) : null}
            </div>
            {hasAnswer ? null : (
              <p className="text-xs text-muted-foreground">
                Answered in the next message
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
