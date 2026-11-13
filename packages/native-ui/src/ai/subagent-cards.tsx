import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { IconRobot } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { cardStyle, sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { Spinner } from "../Spinner";
import { CardButton } from "./card-button";
import { chatTextSize, formatElapsed, MONO_FONT } from "./chat-text";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
} from "./collapsible";
import { ResponseText } from "./response-text";

export type SubagentStatus = "queued" | "running" | "done" | "failed" | "cancelled" | "timed_out";

const STATUS_LABEL: Record<SubagentStatus, string> = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
  timed_out: "Timed out",
};

/** Pill colours per status. Text and border share one hue, the fill is a wash of it. */
export function subagentStatusColors(status: SubagentStatus, scheme: "light" | "dark") {
  const hex =
    status === "running" || status === "queued"
      ? palette.primary[scheme]
      : status === "done"
        ? palette.success[scheme]
        : status === "failed" || status === "timed_out"
          ? palette.danger[scheme]
          : tokens.color.muted[scheme];
  return { color: hex, borderColor: withAlpha(hex, 0.25), backgroundColor: withAlpha(hex, 0.12) };
}

function StatusPill({ status, testID }: { status: SubagentStatus; testID: string }) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const caption = chatTextSize("caption", largerText);
  const colors = subagentStatusColors(status, scheme);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Status: ${STATUS_LABEL[status]}`}
      className="rounded-full border px-2.5 py-0.5"
      style={{ borderColor: colors.borderColor, backgroundColor: colors.backgroundColor }}
    >
      <Text className={cn(caption, "font-instrument-sans-semibold")} style={[sizeStyle(caption), typeStyle("semibold"), { color: colors.color }]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export type SubagentRunCardProps = {
  title: string;
  status: SubagentStatus;
  /** Whole seconds the run has taken. Shown as "12s" or "1m 5s". */
  elapsedSeconds?: number;
  /** Shows a Cancel button while `status` is `queued` or `running`. */
  onCancel?: () => void;
  /** Muted detail under the title, such as step or progress text. */
  statusLine?: string;
  /** Error text, in the danger colour. */
  error?: string;
  /** Replaces the robot icon. While `queued` or `running` a spinner shows instead. */
  avatar?: ReactNode;
  className?: string;
  /** Default `subagent-run-card`. Parts add `-status`, `-elapsed` and `-cancel`. */
  testID?: string;
};

/** A subagent run: title, status pill, elapsed time, and Cancel while it runs. */
export function SubagentRunCard({
  title,
  status,
  elapsedSeconds,
  onCancel,
  statusLine,
  error,
  avatar,
  className,
  testID = "subagent-run-card",
}: SubagentRunCardProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const body = chatTextSize("body", largerText);
  const small = chatTextSize("small", largerText);
  const elapsed = elapsedSeconds == null ? null : formatElapsed(elapsedSeconds);
  return (
    <View
      testID={testID}
      accessible={false}
      accessibilityLabel={`Subagent ${title}, ${STATUS_LABEL[status]}`}
      className={cn("w-full gap-3 p-4", className)}
      style={cardStyle(scheme)}
    >
      <View className="flex-row items-center gap-2">
        {status === "queued" || status === "running" ? (
          <Spinner size="sm" decorative />
        ) : (
          (avatar ?? <IconRobot size={largerText ? 22 : 18} color={tokens.color.muted[scheme]} />)
        )}
        <Text
          numberOfLines={2}
          className={cn(body, "min-w-0 flex-1 font-instrument-sans-semibold")}
          style={[sizeStyle(body), typeStyle("semibold"), textStyle("foreground", scheme)]}
        >
          {title}
        </Text>
        <StatusPill status={status} testID={`${testID}-status`} />
      </View>
      {statusLine ? (
        <Text testID={`${testID}-status-line`} className={small} style={[sizeStyle(small), textStyle("muted", scheme)]}>
          {statusLine}
        </Text>
      ) : null}
      {error ? (
        <Text testID={`${testID}-error`} className={small} style={[sizeStyle(small), { color: palette.danger[scheme] }]}>
          {error}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        {elapsed ? (
          <Text
            testID={`${testID}-elapsed`}
            accessibilityLabel={`Elapsed ${elapsed}`}
            className={small}
            style={[sizeStyle(small), textStyle("muted", scheme), { fontVariant: ["tabular-nums"] }]}
          >
            {elapsed}
          </Text>
        ) : (
          <View />
        )}
        {(status === "running" || status === "queued") && onCancel ? (
          <CardButton
            testID={`${testID}-cancel`}
            label="Cancel"
            accessibilityLabel={`Cancel ${title}`}
            variant="outline"
            onPress={onCancel}
          />
        ) : null}
      </View>
    </View>
  );
}

export type SubagentHandoff = {
  toolName: string;
  server?: string;
  argsSummary: string;
};

export type SubagentResultCardProps = {
  title: string;
  /** The short result, always shown. */
  summary: string;
  /** The full result, shown when the card is open. No fold without it. */
  detail?: string;
  /** Shows the warning note that an approval waits in another chat. */
  approvalPending?: boolean;
  /** Name for `Approval pending in {name}'s chat.` Default "the other bot". */
  approvalPendingIn?: string;
  /** Proposed actions, listed under "Proposed actions". */
  handoffs?: readonly SubagentHandoff[];
  /** A leading avatar beside the title. */
  avatar?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Default `subagent-result-card`. Parts add `-trigger` and `-detail`. */
  testID?: string;
};

/** A subagent's result: the summary, and the detail behind a "Show details" fold. */
export function SubagentResultCard({
  title,
  summary,
  detail,
  approvalPending = false,
  approvalPendingIn,
  handoffs,
  avatar,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
  testID = "subagent-result-card",
}: SubagentResultCardProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const body = chatTextSize("body", largerText);
  const small = chatTextSize("small", largerText);
  return (
    <Collapsible
      testID={testID}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full gap-2 p-4", className)}
      style={cardStyle(scheme)}
    >
      <View className="flex-row items-center gap-2">
        {avatar}
        <Text
          numberOfLines={2}
          className={cn(body, "min-w-0 flex-1 font-instrument-sans-semibold")}
          style={[sizeStyle(body), typeStyle("semibold"), textStyle("foreground", scheme)]}
        >
          {title}
        </Text>
      </View>
      <ResponseText>{summary}</ResponseText>
      {approvalPending ? (
        <Text testID={`${testID}-approval-pending`} className={small} style={[sizeStyle(small), { color: palette.warning[scheme] }]}>
          {`Approval pending in ${approvalPendingIn ? `${approvalPendingIn}'s` : "the other bot's"} chat.`}
        </Text>
      ) : null}
      {handoffs && handoffs.length > 0 ? (
        <View testID={`${testID}-handoffs`} className="gap-1">
          <Text className={small} style={[sizeStyle(small), textStyle("muted", scheme)]}>
            Proposed actions
          </Text>
          {handoffs.map((handoff, index) => (
            <Text
              key={`${handoff.toolName}-${index}`}
              testID={`${testID}-handoff-${index}`}
              className={small}
              style={[sizeStyle(small), textStyle("muted", scheme), { fontFamily: MONO_FONT }]}
            >
              {`${handoff.toolName}${handoff.server ? ` via ${handoff.server}` : ""}: ${handoff.argsSummary}`}
            </Text>
          ))}
        </View>
      ) : null}
      {detail ? (
        <>
          <CollapsibleTrigger
            testID={`${testID}-trigger`}
            accessibilityLabel={`Details for ${title}`}
            className="min-h-11 flex-row items-center gap-1.5 self-start"
          >
            <ToggleLabel small={small} />
          </CollapsibleTrigger>
          <CollapsibleContent testID={`${testID}-detail`}>
            <ResponseText>{detail}</ResponseText>
          </CollapsibleContent>
        </>
      ) : null}
    </Collapsible>
  );
}

function ToggleLabel({ small }: { small: ReturnType<typeof chatTextSize> }) {
  const { open } = useCollapsible();
  const scheme = useScheme();
  return (
    <>
      <Text className={cn(small, "font-instrument-sans")} style={[sizeStyle(small), textStyle("muted", scheme)]}>
        {open ? "Hide details" : "Show details"}
      </Text>
      <CollapsibleChevron open={open} size={14} color={tokens.color.muted[scheme]} />
    </>
  );
}
