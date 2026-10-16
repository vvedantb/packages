"use client";
import * as React from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "../utils/cn";
export interface ClearInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  /** Icon or adornment positioned in the field's left gutter. */
  leading?: React.ReactNode;
  clearLabel?: string;
}
const ClearInput = React.forwardRef<HTMLInputElement, ClearInputProps>(
  (
    {
      value,
      onChange,
      wrapperClassName,
      leading,
      clearLabel = "Clear",
      className,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const mergedRef = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };
    const hasValue = value.length > 0;
    return (
      <div className={cn("relative", wrapperClassName)}>
        {leading}
        <input
          ref={mergedRef}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-field border border-border bg-field-background px-3.5 py-2 text-sm transition-[border-color,background-color] duration-200 ease-smooth placeholder:text-field-placeholder focus-visible:border-focus-border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
            "pr-9",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={hasValue ? 0 : -1}
          className={cn(
            "absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-[opacity,background-color,color,transform] duration-150 ease-out active:duration-100 active:ease-out active:scale-[0.97] hover:bg-surface-tertiary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring before:absolute before:inset-[-8px] before:content-['']",
            hasValue ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!hasValue}
          aria-label={clearLabel}
          onClick={() => {
            onChange("");
            inputRef.current?.focus({ preventScroll: true });
          }}
        >
          <IconX size={14} stroke={1.75} />
        </button>
      </div>
    );
  },
);
export { ClearInput };
