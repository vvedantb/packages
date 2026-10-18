import type * as React from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";
import { Select, SelectContent, SelectTrigger, SelectValue } from "./select";

export interface SelectFieldProps {
  /** Merged onto the trigger. */
  className?: string;
  /** `SelectItem` elements. */
  children?: React.ReactNode;
  label?: React.ReactNode;
  placeholder?: string;
  /** An empty string shows the placeholder. */
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  /** Set on the trigger; the label points at it. */
  id?: string;
  "aria-label"?: string;
}

/** Labelled single select built from the `Select` primitives. */
function SelectField({
  className,
  children,
  label,
  placeholder,
  value,
  onValueChange,
  disabled,
  name,
  id,
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <Label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </Label>
      ) : null}
      <Select
        value={value === undefined || value === "" ? undefined : value}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

export { SelectField };
