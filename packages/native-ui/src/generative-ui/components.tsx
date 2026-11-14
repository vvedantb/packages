import type { ComponentRenderProps } from "@json-render/react-native";
import { IconCheck, IconCircle } from "@tabler/icons-react-native";
import { isHttpUrl, type GenerativeUiProps } from "@vvedantb/server/generative-ui";
import { Children, useState, type ReactNode } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { CodeBlock } from "../ai/code-block";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { sizeStyle, textStyle, typeStyle, type TextSize, type TypeWeight } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { Progress } from "../Progress";
import { Separator } from "../Separator";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { useGenerativeUiPanel } from "./context";
import { ALIGN, BADGE_VARIANT, BUTTON_VARIANT, GAP, toneSurface, toneText } from "./styles";

/**
 * The phone parts of a generative UI panel, one per catalog component, drawn
 * as the web `@vvedantb/ui/generative-ui` draws them: the same sizes, tones and
 * gaps, on the native theme tokens.
 */

/** The web `text-2xs` (11 / 14), for a metric's delta; the other sizes are the shared `text-*`. */
const TEXT_2XS = { fontSize: 11, lineHeight: 14 };

const FONT_CLASS = {
  regular: "font-instrument-sans",
  medium: "font-instrument-sans-medium",
  semibold: "font-instrument-sans-semibold",
} as const;

function Line({
  size,
  weight,
  color,
  text,
  role,
  align,
}: {
  size: TextSize | "text-2xs";
  weight?: TypeWeight;
  color: string;
  text: string;
  role?: "header";
  align?: "right";
}) {
  return (
    <Text
      accessibilityRole={role}
      className={FONT_CLASS[weight ?? "regular"]}
      style={[
        size === "text-2xs" ? TEXT_2XS : sizeStyle(size),
        { color },
        weight ? typeStyle(weight) : null,
        align ? { textAlign: align } : null,
      ]}
    >
      {text}
    </Text>
  );
}

export function StackElement({ element, children }: ComponentRenderProps<GenerativeUiProps<"Stack">>) {
  const { direction, gap, align } = element.props;
  const vertical = direction === "vertical";
  return (
    <View
      className="min-w-0"
      style={{
        flexDirection: vertical ? "column" : "row",
        flexWrap: vertical ? "nowrap" : "wrap",
        gap: GAP[gap],
        alignItems: ALIGN[align],
      }}
    >
      {children}
    </View>
  );
}

/** Equal columns (the web `grid-cols-2` / `-3`), filled row by row. */
export function GridElement({ element, children }: ComponentRenderProps<GenerativeUiProps<"Grid">>) {
  const columns = element.props.columns === 3 ? 3 : 2;
  const gap = GAP[element.props.gap];
  const cells = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let index = 0; index < cells.length; index += columns) rows.push(cells.slice(index, index + columns));
  return (
    <View className="min-w-0" style={{ gap }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row" style={{ gap }}>
          {Array.from({ length: columns }, (_, column) => (
            <View key={column} className="min-w-0 flex-1">
              {row[column] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function PanelElement({ element, children }: ComponentRenderProps<GenerativeUiProps<"Panel">>) {
  const scheme = useScheme();
  const { title, description } = element.props;
  return (
    <View
      className="min-w-0 gap-2 p-3"
      style={{ backgroundColor: tokens.color.surfaceSecondary[scheme], borderRadius: tokens.radius.lg }}
    >
      {title ? <Line size="text-sm" weight="semibold" color={tokens.color.foreground[scheme]} text={title} /> : null}
      {description ? <Line size="text-xs" color={tokens.color.muted[scheme]} text={description} /> : null}
      {children}
    </View>
  );
}

export function SeparatorElement() {
  return <Separator className="my-1" />;
}

export function HeadingElement({ element }: ComponentRenderProps<GenerativeUiProps<"Heading">>) {
  const scheme = useScheme();
  const { text, level } = element.props;
  return (
    <Line
      size={level === "h2" ? "text-base" : "text-sm"}
      weight="semibold"
      color={tokens.color.foreground[scheme]}
      text={text}
      role="header"
    />
  );
}

export function TextElement({ element }: ComponentRenderProps<GenerativeUiProps<"Text">>) {
  const scheme = useScheme();
  const { variant, text } = element.props;
  if (variant === "muted") return <Line size="text-xs" color={tokens.color.muted[scheme]} text={text} />;
  return (
    <Line
      size="text-sm"
      weight={variant === "lead" ? "medium" : undefined}
      color={tokens.color.foreground[scheme]}
      text={text}
    />
  );
}

export function MetricElement({ element }: ComponentRenderProps<GenerativeUiProps<"Metric">>) {
  const scheme = useScheme();
  const { label, value, delta, tone } = element.props;
  return (
    <View className="min-w-0 gap-0.5" accessible accessibilityLabel={`${label}, ${value}`}>
      <Line size="text-xs" color={tokens.color.muted[scheme]} text={label} />
      {/* The web `text-lg font-semibold tabular-nums leading-tight`. */}
      <Text
        className={FONT_CLASS.semibold}
        style={[
          sizeStyle("text-lg", "tight"),
          typeStyle("semibold"),
          { fontVariant: ["tabular-nums"], color: toneText(tone, scheme) },
        ]}
      >
        {value}
      </Text>
      {delta ? <Line size="text-2xs" color={tokens.color.muted[scheme]} text={delta} /> : null}
    </View>
  );
}

export function BadgeElement({ element }: ComponentRenderProps<GenerativeUiProps<"Badge">>) {
  return (
    <View className="self-start">
      <Badge variant={BADGE_VARIANT[element.props.tone]}>{element.props.text}</Badge>
    </View>
  );
}

export function CalloutElement({ element }: ComponentRenderProps<GenerativeUiProps<"Callout">>) {
  const scheme = useScheme();
  const { title, text, tone } = element.props;
  return (
    <View
      className="min-w-0 gap-1 p-3"
      style={{ backgroundColor: toneSurface(tone, scheme), borderRadius: tokens.radius.lg }}
    >
      {title ? <Line size="text-xs" weight="semibold" color={toneText(tone, scheme)} text={title} /> : null}
      <Line size="text-sm" color={tokens.color.foreground[scheme]} text={text} />
    </View>
  );
}

export function ProgressElement({ element }: ComponentRenderProps<GenerativeUiProps<"Progress">>) {
  const scheme = useScheme();
  const { label, value } = element.props;
  const muted = tokens.color.muted[scheme];
  return (
    <View className="min-w-0 gap-1.5">
      <View className="flex-row items-center justify-between">
        <Line size="text-xs" color={muted} text={label ?? "Progress"} />
        <Line size="text-xs" color={muted} text={`${Math.round(value)}%`} />
      </View>
      <Progress value={value} accessibilityLabel={label ?? "Progress"} />
    </View>
  );
}

export function ChecklistElement({ element }: ComponentRenderProps<GenerativeUiProps<"Checklist">>) {
  const scheme = useScheme();
  const muted = tokens.color.muted[scheme];
  return (
    <View className="min-w-0 gap-1.5">
      {element.props.items.map((item, index) => (
        <View
          key={index}
          className="flex-row items-start gap-2"
          accessible
          accessibilityLabel={`${item.text}, ${item.done ? "done" : "not done"}`}
        >
          <View className="mt-[3px]">
            {item.done ? (
              <IconCheck size={14} color={palette.success[scheme]} />
            ) : (
              <IconCircle size={14} color={withAlpha(muted, 0.6)} />
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Line size="text-sm" color={item.done ? muted : tokens.color.foreground[scheme]} text={item.text} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** The web `Table`: a header row and rows under hairlines, scrolling sideways when wider than the panel. */
export function TableElement({ element }: ComponentRenderProps<GenerativeUiProps<"Table">>) {
  const scheme = useScheme();
  const { columns, rows } = element.props;
  const rule = { borderBottomWidth: 1, borderBottomColor: tokens.color.border[scheme] };
  const cell = (text: string, header: boolean, index: number) => (
    <View key={index} className="px-2 py-2" style={{ minWidth: 96, maxWidth: 240 }}>
      <Line
        size="text-sm"
        weight={header ? "medium" : undefined}
        color={header ? tokens.color.muted[scheme] : tokens.color.foreground[scheme]}
        text={text}
      />
    </View>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
      <View>
        <View className="flex-row" style={rule}>
          {columns.map((column, index) => cell(column, true, index))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row" style={rowIndex < rows.length - 1 ? rule : null}>
            {columns.map((_, index) => cell(row[index] ?? "", false, index))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function KeyValueElement({ element }: ComponentRenderProps<GenerativeUiProps<"KeyValue">>) {
  const scheme = useScheme();
  return (
    <View className="min-w-0 gap-1.5">
      {element.props.items.map((item, index) => (
        <View key={index} className="flex-row items-baseline justify-between gap-3">
          <Line size="text-xs" color={tokens.color.muted[scheme]} text={item.label} />
          <View className="min-w-0 flex-1">
            <Line size="text-sm" color={tokens.color.foreground[scheme]} text={item.value} align="right" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function CodeElement({ element }: ComponentRenderProps<GenerativeUiProps<"Code">>) {
  const { onCopy } = useGenerativeUiPanel();
  const { code, language } = element.props;
  return <CodeBlock code={code} language={language ?? undefined} onCopy={onCopy} />;
}

/**
 * The web `max-h-80 w-full object-contain`: full width at the image's own
 * shape, at most 320 high. An image that fails to load (an expired link)
 * takes no space, not an empty 4:3 box.
 */
export function ImageElement({ element }: ComponentRenderProps<GenerativeUiProps<"Image">>) {
  const { url, alt } = element.props;
  const [aspect, setAspect] = useState(4 / 3);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  // A stored spec is data: only a hosted http(s) image loads, never `file:` or `content:`.
  if (!isHttpUrl(url) || failed) return null;
  const height = width > 0 ? Math.min(320, width / aspect) : 0;
  return (
    <View className="w-full" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Image
        source={{ uri: url }}
        accessibilityLabel={alt ?? undefined}
        accessible={alt !== null}
        resizeMode="contain"
        style={{
          width: "100%",
          height: height > 0 ? height : undefined,
          aspectRatio: height > 0 ? undefined : aspect,
          borderRadius: tokens.radius.lg,
        }}
        onLoad={(event) => {
          const { width: w, height: h } = event.nativeEvent.source;
          if (w > 0 && h > 0) setAspect(w / h);
        }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

export function ButtonElement({ element, emit }: ComponentRenderProps<GenerativeUiProps<"Button">>) {
  const { canPress } = useGenerativeUiPanel();
  const { label, variant } = element.props;
  return (
    <View className="self-start">
      <Button
        size="sm"
        variant={BUTTON_VARIANT[variant]}
        fullWidth={false}
        disabled={!canPress}
        onPress={() => emit("press")}
      >
        {label}
      </Button>
    </View>
  );
}
