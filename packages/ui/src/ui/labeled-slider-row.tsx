import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";
import { Slider } from "./slider";

interface LabeledSliderRowProps {
  id: string;
  label: string;
  description?: string;
  value: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  icon?: ReactNode;
  /** Formats the right-aligned value display. Default joins the values with an en dash. */
  formatValue?: (value: number[]) => ReactNode;
  minLabel?: ReactNode;
  maxLabel?: ReactNode;
  thumbLabels?: string[];
  className?: string;
}

export function LabeledSliderRow({
  id,
  label,
  description,
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step,
  disabled,
  icon,
  formatValue = (v) => v.join("–"),
  minLabel,
  maxLabel,
  thumbLabels,
  className,
}: LabeledSliderRowProps) {
  const labelId = `${id}-label`;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {icon ? (
            <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
          ) : null}
          <div className="min-w-0">
            <Label id={labelId} htmlFor={id} className="text-sm font-medium">
              {label}
            </Label>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>
            ) : null}
          </div>
        </div>
        <output htmlFor={id} className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {formatValue(value)}
        </output>
      </div>
      {/* The thumb is a span, which `htmlFor` cannot name, so aria-labelledby carries the name unless thumbLabels does. */}
      <Slider
        id={id}
        aria-labelledby={thumbLabels ? undefined : labelId}
        value={value}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        thumbLabels={thumbLabels}
      />
      {minLabel != null || maxLabel != null ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
