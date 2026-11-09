import { Text, View } from "react-native";
import { IconRobot } from "@tabler/icons-react-native";
import { cn } from "../cn";
import { cardStyle, sizeStyle, textStyle, typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { CardButton } from "./card-button";
import { chatTextSize, formatElapsed } from "./chat-text";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
} from "./collapsible";
import { ResponseText } from "./response-text";

export type SubagentStatus = "running" | "done" | "failed" | "cancelled";

const STATUS_LABEL: Record<SubagentStatus, string> = {
  running: "Running",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Pill colours per status. Text and border share one hue, the fill is a wash of it. */
export function subagentStatusColors(status: SubagentStatus, scheme: "light" | "dark") {
  const hex =
    status === "running"
      ? palette.primary[scheme]
      : status === "done"
        ? palette.success[scheme]
        : status === "failed"
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
  /** Shows a Cancel button while `status` is `running`. */
  onCancel?: () => void;
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
        <IconRobot size={largerText ? 22 : 18} color={tokens.color.muted[scheme]} />
        <Text
          numberOfLines={2}
          className={cn(body, "min-w-0 flex-1 font-instrument-sans-semibold")}
          style={[sizeStyle(body), typeStyle("semibold"), textStyle("foreground", scheme)]}
        >
          {title}
        </Text>
        <StatusPill status={status} testID={`${testID}-status`} />
      </View>
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
        {status === "running" && onCancel ? (
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

export type SubagentResultCardProps = {
  title: string;
  /** The short result, always shown. */
  summary: string;
  /** The full result, shown when the card is open. No fold without it. */
  detail?: string;
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
      <Text
        numberOfLines={2}
        className={cn(body, "font-instrument-sans-semibold")}
        style={[sizeStyle(body), typeStyle("semibold"), textStyle("foreground", scheme)]}
      >
        {title}
      </Text>
      <ResponseText>{summary}</ResponseText>
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
