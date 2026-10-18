import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";
import { Switch } from "./switch";

interface LabeledSwitchRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function LabeledSwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  icon,
  trailing,
  className,
}: LabeledSwitchRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 max-sm:flex-wrap", className)}>
      <div className="flex min-w-0 items-start gap-2">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
        ) : null}
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>
          ) : null}
        </div>
      </div>
      {trailing ?? (
        <div className="flex min-h-10 shrink-0 items-center">
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
