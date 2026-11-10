import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { IconTool } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { cardStyle, sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { withAlpha, palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { Input } from "../Input";
import { Textarea } from "../Textarea";
import { CardButton } from "./card-button";
import { chatTextSize, MONO_FONT } from "./chat-text";

export type DraftFieldRole = "to" | "cc" | "bcc" | "subject" | "body";
export type DraftField = { key: string; role: DraftFieldRole; value: string };
export type DraftEdit = { key: string; value: string };

export const DRAFT_ROLE_LABELS: Record<DraftFieldRole, string> = {
  to: "To",
  cc: "Cc",
  bcc: "Bcc",
  subject: "Subject",
  body: "Message",
};

/** The fields whose value differs from the original. `read` returns the edited value, or undefined for no edit. */
export function changedDraftEdits(
  fields: readonly DraftField[],
  read: (key: string) => string | undefined,
): DraftEdit[] {
  return fields.flatMap((field) => {
    const value = read(field.key);
    return value === undefined || value === field.value ? [] : [{ key: field.key, value }];
  });
}

/** What the reader chose. `edit` is offered by `ToolDraftCard` only. */
export type ToolDecision = "approve" | "deny" | "edit";

export type ToolApprovalCardProps = {
  /** The tool the model wants to run. */
  toolName: string;
  /** The arguments, as a short string or an object. Shown cut to `ARGS_MAX_CHARS`. */
  args?: string | Record<string, unknown>;
  /** Called with the choice. */
  onDecide?: (decision: ToolDecision, edits?: DraftEdit[]) => void;
  /** True while the app sends the decision: the buttons are off and the card says so. */
  pending?: boolean;
  /** Turns the buttons off without the pending state. */
  disabled?: boolean;
  approveLabel?: string;
  denyLabel?: string;
  /** The tool server. The meta line reads `via {server}`, else `built-in tool`. */
  server?: string;
  /** Appends "queued while you were away" to the meta line. */
  routineMode?: boolean;
  /** Expiry text the app has formatted. Appends `Expires {expiresLabel}` to the meta line. */
  expiresLabel?: string;
  /** Shows a `Target: {target}` line. */
  target?: string;
  /** Replaces the default meta line. */
  meta?: ReactNode;
  /** Extra content under the meta line (above the target and args). */
  chrome?: ReactNode;
  className?: string;
  /** Default `tool-approval-card`. The buttons add `-approve`, `-deny` and `-edit`. */
  testID?: string;
};

/** Characters of the args summary before it is cut with an ellipsis. */
export const ARGS_MAX_CHARS = 160;

/** One line summary of tool arguments, cut at `max` characters. */
export function summarizeArgs(args: string | Record<string, unknown> | undefined, max: number = ARGS_MAX_CHARS): string {
  if (args == null) return "";
  let text: string;
  if (typeof args === "string") {
    text = args;
  } else {
    try {
      text = JSON.stringify(args) ?? "";
    } catch {
      text = "[unserialisable arguments]";
    }
  }
  text = text.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

type BaseProps = ToolApprovalCardProps & {
  allowEdit?: boolean;
  editLabel?: string;
  heading: string;
  /** Text between the source and the expiry in the default meta line. */
  metaNote?: string;
  fields?: readonly DraftField[];
};

function ToolCardBase({
  toolName,
  args,
  onDecide,
  pending = false,
  disabled = false,
  approveLabel = "Approve",
  denyLabel = "Deny",
  editLabel = "Edit",
  allowEdit = false,
  heading,
  metaNote,
  fields,
  server,
  routineMode = false,
  expiresLabel,
  target,
  meta,
  chrome,
  className,
  testID = "tool-approval-card",
}: BaseProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const body = chatTextSize("body", largerText);
  const small = chatTextSize("small", largerText);
  const caption = chatTextSize("caption", largerText);
  const off = pending || disabled;
  const summary = summarizeArgs(args);
  const [edits, setEdits] = useState<Record<string, string> | null>(null);
  const hasFields = fields !== undefined;
  const headerFields = fields?.filter((field) => field.role !== "body") ?? [];
  const bodyField = fields?.find((field) => field.role === "body");
  const metaText = [
    server ? `via ${server}` : "built-in tool",
    ...(metaNote ? [metaNote] : []),
  ].join(" · ") + (routineMode ? " · queued while you were away" : "") + (expiresLabel ? ` · Expires ${expiresLabel}` : "");
  const showMeta = meta !== undefined || server !== undefined || routineMode || expiresLabel !== undefined || metaNote !== undefined;
  const onEdit = () => {
    if (!fields) return onDecide?.("edit");
    setEdits(edits ? null : Object.fromEntries(fields.map((field) => [field.key, field.value])));
  };
  const onApprove = () => {
    if (fields && edits) onDecide?.("approve", changedDraftEdits(fields, (key) => edits[key]));
    else onDecide?.("approve");
  };
  return (
    <View
      testID={testID}
      accessible={false}
      accessibilityLabel={`${heading}: ${toolName}`}
      className={cn("w-full gap-3 p-4", className)}
      style={[
        cardStyle(scheme),
        { borderWidth: 1, borderColor: withAlpha(palette.primary[scheme], 0.25) },
      ]}
    >
      <View className="flex-row items-center gap-2">
        <IconTool size={largerText ? 20 : 16} color={tokens.color.muted[scheme]} />
        <Text
          className={cn(caption, "font-instrument-sans-semibold")}
          style={[sizeStyle(caption), typeStyle("semibold"), textStyle("muted", scheme)]}
        >
          {pending ? "Sending decision…" : heading}
        </Text>
      </View>
      {showMeta ? (
        meta ?? (
          <Text testID={`${testID}-meta`} className={caption} style={[sizeStyle(caption), textStyle("muted", scheme)]}>
            {metaText}
          </Text>
        )
      ) : null}
      {chrome}
      <Text
        testID={`${testID}-name`}
        numberOfLines={2}
        className={cn(body, "font-instrument-sans-semibold")}
        style={[sizeStyle(body), typeStyle("semibold"), textStyle("foreground", scheme)]}
      >
        {toolName}
      </Text>
      {target ? (
        <Text testID={`${testID}-target`} className={small} style={[sizeStyle(small), textStyle("muted", scheme)]}>
          {`Target: ${target}`}
        </Text>
      ) : null}
      {hasFields ? (
        edits ? (
          <View testID={`${testID}-editor`} className="gap-2">
            {fields.map((field) => (
              <View key={field.key} className="gap-1">
                <Text className={caption} style={[sizeStyle(caption), textStyle("muted", scheme)]}>
                  {DRAFT_ROLE_LABELS[field.role]}
                </Text>
                {field.role === "body" ? (
                  <Textarea
                    testID={`${testID}-field-${field.key}`}
                    value={edits[field.key] ?? ""}
                    onChangeText={(value: string) => setEdits({ ...edits, [field.key]: value })}
                    numberOfLines={8}
                    accessibilityLabel={DRAFT_ROLE_LABELS[field.role]}
                  />
                ) : (
                  <Input
                    testID={`${testID}-field-${field.key}`}
                    value={edits[field.key] ?? ""}
                    onChangeText={(value: string) => setEdits({ ...edits, [field.key]: value })}
                    accessibilityLabel={DRAFT_ROLE_LABELS[field.role]}
                  />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View testID={`${testID}-preview`} className="gap-2">
            {headerFields.map((field) => (
              <View key={field.key} className="flex-row gap-2">
                <Text className={cn(caption, "w-16")} style={[sizeStyle(caption), textStyle("muted", scheme)]}>
                  {DRAFT_ROLE_LABELS[field.role]}
                </Text>
                <Text className={cn(small, "min-w-0 flex-1")} style={[sizeStyle(small), textStyle("foreground", scheme)]}>
                  {field.value}
                </Text>
              </View>
            ))}
            {bodyField ? (
              <Text numberOfLines={12} className={body} style={[sizeStyle(body), textStyle("foreground", scheme)]}>
                {bodyField.value}
              </Text>
            ) : null}
          </View>
        )
      ) : summary ? (
        <Text
          testID={`${testID}-args`}
          numberOfLines={3}
          className={small}
          style={[sizeStyle(small), textStyle("muted", scheme), { fontFamily: MONO_FONT }]}
        >
          {summary}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center justify-end gap-2" accessibilityState={{ busy: pending }}>
        <CardButton
          testID={`${testID}-deny`}
          label={denyLabel}
          accessibilityLabel={`${denyLabel} ${toolName}`}
          variant="outline"
          disabled={off}
          onPress={() => onDecide?.("deny")}
        />
        {allowEdit ? (
          <CardButton
            testID={`${testID}-edit`}
            label={edits ? "Cancel edit" : editLabel}
            accessibilityLabel={`${edits ? "Cancel edit" : editLabel} ${toolName}`}
            variant="secondary"
            disabled={off}
            onPress={onEdit}
          />
        ) : null}
        <CardButton
          testID={`${testID}-approve`}
          label={approveLabel}
          accessibilityLabel={`${approveLabel} ${toolName}`}
          variant="primary"
          disabled={off}
          onPress={onApprove}
        />
      </View>
    </View>
  );
}

/**
 * A pending tool call that needs a yes or no: the tool name, a cut summary of
 * the arguments, and Deny and Approve buttons (44 point targets). With
 * `pending` or `disabled` both buttons are off.
 */
export function ToolApprovalCard(props: ToolApprovalCardProps) {
  return <ToolCardBase {...props} heading="Approval needed" />;
}

export type ToolDraftCardProps = ToolApprovalCardProps & {
  editLabel?: string;
  /** The draft fields. Shows them as a preview and, under Edit, as inputs. Without them Edit reports `"edit"`. */
  fields?: readonly DraftField[];
};

/** As `ToolApprovalCard`, plus an Edit button that reports `"edit"`, for a draft the reader may change first. */
export function ToolDraftCard({ testID = "tool-draft-card", ...props }: ToolDraftCardProps) {
  return <ToolCardBase {...props} testID={testID} allowEdit heading="Draft for review" metaNote="Nothing is sent until you press Send" />;
}
