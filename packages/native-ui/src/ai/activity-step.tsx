import type { ComponentType } from "react";
import { IconAlertTriangle, IconCheck, type IconProps } from "@tabler/icons-react-native";
import { Spinner } from "../Spinner";
import { useLargerText } from "../theme";
import { AgentTraceDescription, AgentTraceIcon, AgentTraceLine, AgentTraceTitle } from "./trace";

export type ActivityStepStatus = "running" | "complete" | "error";

export type ActivityStepProps = {
  /** What the AI is doing, such as "Searching the web" or "Reading 3 files". */
  label: string;
  /** The tool's icon. Without one, the line shows the status icon only. */
  icon?: ComponentType<IconProps>;
  /** `running` pulses the label and shows a spinner; `complete` a check; `error` a warning in the danger colour. Default `complete`. */
  status?: ActivityStepStatus;
  /** Faded detail after the label, such as "Worked for 12s" (see `formatElapsed`). */
  description?: string;
  testID?: string;
};

/**
 * One tool or activity step as a single trace line: icon, label, status and
 * an optional description. A light stand-in for the web `ActivityTasks`, built
 * on the `AgentTrace` parts. Its accessibility label reads the label, the
 * status and the description.
 */
export function ActivityStep({
  label,
  icon,
  status = "complete",
  description,
  testID,
}: ActivityStepProps) {
  const largerText = useLargerText();
  const running = status === "running";
  const state = running ? "in progress" : status === "error" ? "failed" : "done";
  return (
    <AgentTraceLine
      testID={testID}
      status={status === "error" ? "error" : undefined}
      accessible
      accessibilityLabel={[label, state, description].filter(Boolean).join(", ")}
      accessibilityState={{ busy: running }}
    >
      {icon ? <AgentTraceIcon icon={icon} /> : null}
      <AgentTraceTitle shimmer={running}>{label}</AgentTraceTitle>
      {description ? <AgentTraceDescription>{description}</AgentTraceDescription> : null}
      {running ? (
        <AgentTraceIcon>
          <Spinner size={largerText ? "md" : "sm"} decorative />
        </AgentTraceIcon>
      ) : (
        <AgentTraceIcon icon={status === "error" ? IconAlertTriangle : IconCheck} />
      )}
    </AgentTraceLine>
  );
}
