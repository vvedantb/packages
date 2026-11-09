import { Text, View } from "react-native";
import { IconTool } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { cardStyle, sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { withAlpha, palette } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { CardButton } from "./card-button";
import { chatTextSize, MONO_FONT } from "./chat-text";

/** What the reader chose. `edit` is offered by `ToolDraftCard` only. */
export type ToolDecision = "approve" | "deny" | "edit";

export type ToolApprovalCardProps = {
  /** The tool the model wants to run. */
  toolName: string;
  /** The arguments, as a short string or an object. Shown cut to `ARGS_MAX_CHARS`. */
  args?: string | Record<string, unknown>;
  /** Called with the choice. */
  onDecide?: (decision: ToolDecision) => void;
  /** True while the app sends the decision: the buttons are off and the card says so. */
  pending?: boolean;
  /** Turns the buttons off without the pending state. */
  disabled?: boolean;
  approveLabel?: string;
  denyLabel?: string;
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

type BaseProps = ToolApprovalCardProps & { allowEdit?: boolean; editLabel?: string; heading: string };

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
      <Text
        testID={`${testID}-name`}
        numberOfLines={2}
        className={cn(body, "font-instrument-sans-semibold")}
        style={[sizeStyle(body), typeStyle("semibold"), textStyle("foreground", scheme)]}
      >
        {toolName}
      </Text>
      {summary ? (
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
            label={editLabel}
            accessibilityLabel={`${editLabel} ${toolName}`}
            variant="secondary"
            disabled={off}
            onPress={() => onDecide?.("edit")}
          />
        ) : null}
        <CardButton
          testID={`${testID}-approve`}
          label={approveLabel}
          accessibilityLabel={`${approveLabel} ${toolName}`}
          variant="primary"
          disabled={off}
          onPress={() => onDecide?.("approve")}
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
};

/** As `ToolApprovalCard`, plus an Edit button that reports `"edit"`, for a draft the reader may change first. */
export function ToolDraftCard({ testID = "tool-draft-card", ...props }: ToolDraftCardProps) {
  return <ToolCardBase {...props} testID={testID} allowEdit heading="Draft for review" />;
}
