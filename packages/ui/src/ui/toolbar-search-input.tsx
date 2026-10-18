import * as React from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { Input } from "./input";

export interface ToolbarSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Default `"Search..."`. */
  placeholder?: string;
  /** `aria-label` of the input. Default `"Search"`. */
  label?: string;
  /** `aria-label` of the clear button. Default `"Clear search"`. */
  clearLabel?: string;
  className?: string;
  inputClassName?: string;
}

/**
 * Stable rounded search field for toolbars: no enter or clear animations, no
 * layout jump. The clear button stays mounted and is hidden while the value is
 * blank. Clearing does not move focus. The ref points at the `<input>`.
 */
export const ToolbarSearchInput = React.forwardRef<HTMLInputElement, ToolbarSearchInputProps>(
  function ToolbarSearchInput(
    {
      value,
      onChange,
      placeholder = "Search...",
      label = "Search",
      clearLabel = "Clear search",
      className,
      inputClassName,
    },
    ref,
  ) {
    const active = value.trim().length > 0;

    return (
      <div className={cn("relative min-w-0 flex-1 sm:flex-none", className)}>
        <IconSearch
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          enterKeyHint="search"
          className={cn(
            // match outline toolbar buttons beside it
            "h-8 w-full min-w-0 rounded-lg border border-border bg-transparent pl-8 pr-8 text-sm shadow-none sm:w-44 md:w-52",
            "placeholder:text-muted-foreground/70 hover:bg-default",
            "focus-visible:border-border focus-visible:bg-default focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            inputClassName,
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={clearLabel}
          tabIndex={active ? 0 : -1}
          aria-hidden={!active}
          className={cn(
            "absolute right-0.5 top-1/2 z-[1] h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground",
            !active && "pointer-events-none opacity-0",
          )}
          onClick={() => onChange("")}
        >
          <IconX size={14} stroke={1.75} />
        </Button>
      </div>
    );
  },
);
