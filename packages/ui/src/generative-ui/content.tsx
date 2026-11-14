import type { ComponentRenderProps } from "@json-render/react";
import { IconCheck, IconCircle } from "@tabler/icons-react";
import type { GenerativeUiProps } from "@vvedantb/server/generative-ui";
import { CodeBlock } from "../ai-elements/code-block";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "../utils/cn";
import { BADGE_VARIANT, TONE_SURFACE, TONE_TEXT } from "./toneStyles";

/** The leaves of a composed panel: everything that shows the agent's content. */

const TEXT_VARIANT = {
  body: "text-sm text-foreground",
  lead: "text-sm font-medium text-foreground",
  muted: "text-xs text-muted-foreground",
};

export function HeadingElement({ element }: ComponentRenderProps<GenerativeUiProps<"Heading">>) {
  const { text, level } = element.props;
  return <p className={cn("font-semibold text-foreground", level === "h2" ? "text-base" : "text-sm")}>{text}</p>;
}

export function TextElement({ element }: ComponentRenderProps<GenerativeUiProps<"Text">>) {
  return <p className={cn("wrap-anywhere", TEXT_VARIANT[element.props.variant])}>{element.props.text}</p>;
}

export function MetricElement({ element }: ComponentRenderProps<GenerativeUiProps<"Metric">>) {
  const { label, value, delta, tone } = element.props;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold tabular-nums leading-tight", TONE_TEXT[tone])}>{value}</span>
      {delta ? <span className="text-2xs text-muted-foreground">{delta}</span> : null}
    </div>
  );
}

export function BadgeElement({ element }: ComponentRenderProps<GenerativeUiProps<"Badge">>) {
  return <Badge variant={BADGE_VARIANT[element.props.tone]}>{element.props.text}</Badge>;
}

export function CalloutElement({ element }: ComponentRenderProps<GenerativeUiProps<"Callout">>) {
  const { title, text, tone } = element.props;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-surface p-3", TONE_SURFACE[tone])}>
      {title ? <span className={cn("text-xs font-semibold", TONE_TEXT[tone])}>{title}</span> : null}
      <span className="wrap-anywhere text-sm text-foreground">{text}</span>
    </div>
  );
}

export function ProgressElement({ element }: ComponentRenderProps<GenerativeUiProps<"Progress">>) {
  const { label, value } = element.props;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label ?? "Progress"}</span>
        <span className="tabular-nums">{Math.round(value)}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function ChecklistElement({ element }: ComponentRenderProps<GenerativeUiProps<"Checklist">>) {
  return (
    <ul className="flex min-w-0 flex-col gap-1.5">
      {element.props.items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          {item.done ? (
            <IconCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
          ) : (
            <IconCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
          )}
          <span className={cn("wrap-anywhere", item.done ? "text-muted-foreground" : "text-foreground")}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TableElement({ element }: ComponentRenderProps<GenerativeUiProps<"Table">>) {
  const { columns, rows } = element.props;
  return (
    <div className="min-w-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((_, cellIndex) => (
                <TableCell key={cellIndex}>{row[cellIndex] ?? ""}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function KeyValueElement({ element }: ComponentRenderProps<GenerativeUiProps<"KeyValue">>) {
  return (
    <dl className="flex min-w-0 flex-col gap-1.5">
      {element.props.items.map((item, index) => (
        <div key={index} className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="wrap-anywhere text-right text-sm text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CodeElement({ element }: ComponentRenderProps<GenerativeUiProps<"Code">>) {
  const { code, language } = element.props;
  return <CodeBlock code={code} className="min-w-0" {...(language ? { language } : {})} />;
}

export function ImageElement({ element }: ComponentRenderProps<GenerativeUiProps<"Image">>) {
  const { url, alt } = element.props;
  return <img src={url} alt={alt ?? ""} loading="lazy" className="max-h-80 w-full rounded-surface object-contain" />;
}

const BUTTON_VARIANT = { primary: "default", secondary: "secondary", ghost: "ghost" } as const;

export function ButtonElement({ element, emit }: ComponentRenderProps<GenerativeUiProps<"Button">>) {
  const { label, variant } = element.props;
  return (
    <Button type="button" size="sm" variant={BUTTON_VARIANT[variant]} onClick={() => emit("press")}>
      {label}
    </Button>
  );
}
