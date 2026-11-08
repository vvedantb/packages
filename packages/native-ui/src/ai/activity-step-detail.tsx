import { Text, View } from "react-native";
import { Badge } from "../Badge";
import { sizeStyle, textStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { useLargerText } from "../theme";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { MONO_FONT, chatTextSize } from "./chat-text";
import { CodeBlock } from "./code-block";

/** The step fields the detail reads: the web `ActivityStep` subset. */
export type ActivityStepDetailStep = {
  type: string;
  detail?: string;
  /** Bash command, fuller than `detail`. */
  command?: string;
  output?: { text: string; exitCode?: number; truncated?: boolean };
  edits?: ReadonlyArray<{ oldText: string; newText: string }>;
  /** A written file's preview. */
  contentPreview?: string;
  /** The transcript copy dropped the output, edits or preview; the full step is still loading. */
  hasHiddenDetail?: boolean;
};

export type ActivityStepDetailProps = {
  step: ActivityStepDetailStep;
  /** Copy button on the transcript and preview blocks (native-ui adds no clipboard). */
  onCopy?: (text: string) => void | Promise<void>;
  /** Default "Loading output...". */
  loadingLabel?: string;
};

/** Web `bg-emerald-500/10` and `text-emerald-700` (dark `text-emerald-300`). */
const EMERALD = { fill: "#10b981", light: "#047857", dark: "#6ee7b7" } as const;

/**
 * A tool step's body, as the web `ActivityStepDetail`: exit code and
 * "Truncated" badges, the shell transcript (`$ command`, a blank line, then
 * the output) in a `CodeBlock`, edits as a red before block over a green after
 * block, and a written file's preview. While `hasHiddenDetail` is set and
 * nothing has loaded, "Loading output...".
 */
export function ActivityStepDetail({ step, onCopy, loadingLabel = "Loading output..." }: ActivityStepDetailProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const caption = chatTextSize("caption", largerText);
  const command = step.command ?? (step.type === "bash" ? step.detail : undefined);
  const transcript = [command ? `$ ${command}` : null, step.output?.text ?? null]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
  const awaitingDetail = step.hasHiddenDetail === true && !step.output && !step.edits?.length && !step.contentPreview;
  const exitCode = step.output?.exitCode;
  const mono = [sizeStyle(caption), { fontFamily: MONO_FONT }];

  return (
    <View style={{ gap: 8 }}>
      {awaitingDetail ? (
        <Text className="font-instrument-sans" style={[sizeStyle(caption), textStyle("muted", scheme)]}>
          {loadingLabel}
        </Text>
      ) : null}
      {exitCode !== undefined || step.output?.truncated ? (
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {exitCode !== undefined ? (
            <Badge variant={exitCode === 0 ? "secondary" : "destructive"}>{`Exit code ${exitCode}`}</Badge>
          ) : null}
          {step.output?.truncated ? <Badge variant="outline">Truncated</Badge> : null}
        </View>
      ) : null}
      {transcript ? <CodeBlock code={transcript} language="shell" highlight={false} onCopy={onCopy} /> : null}
      {(step.edits ?? []).map((edit, index) => (
        <View
          key={index}
          style={{ borderRadius: 6, borderWidth: 1, borderColor: tokens.color.border[scheme], overflow: "hidden" }}
        >
          <Text
            selectable
            style={[mono, { padding: 8, color: palette.danger[scheme], backgroundColor: withAlpha(palette.danger[scheme], 0.1) }]}
          >
            {edit.oldText}
          </Text>
          <Text
            selectable
            style={[mono, { padding: 8, color: EMERALD[scheme], backgroundColor: withAlpha(EMERALD.fill, 0.1) }]}
          >
            {edit.newText}
          </Text>
        </View>
      ))}
      {step.contentPreview ? (
        <CodeBlock code={step.contentPreview} language="text" highlight={false} onCopy={onCopy} />
      ) : null}
    </View>
  );
}
