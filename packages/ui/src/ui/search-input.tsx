"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";
import { ClearInput, type ClearInputProps } from "./clear-input";
import { Kbd } from "./kbd";
import { useCn, useUiConfig } from "./ui-config";

const sizeClasses = {
  sm: { input: "h-8 pl-8 text-sm", icon: "left-2" },
  md: { input: "h-10 pl-9", icon: "left-3" },
};

const variantClasses = {
  default: { wrapper: "", input: "" },
  toolbar: {
    wrapper: "min-w-0 flex-1 sm:flex-none",
    input: "min-w-0 bg-transparent shadow-none hover:bg-default focus-visible:bg-default sm:w-44 md:w-52",
  },
};

type EnterKeyHint = React.InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];

/**
 * `UiConfig.SearchInput`. `classes.input` and `classes.icon` replace the
 * size classes of the input and the whole icon class; `classes.wrapper` is a
 * base for the wrapper. Variant classes still apply after them. The other keys
 * are prop defaults; `false` leaves the attribute off.
 */
export interface SearchInputConfig {
  classes?: { wrapper?: string; input?: string; icon?: string };
  /** Search icon size in px. Default `16`. */
  iconSize?: number;
  label?: string | false;
  placeholder?: string;
  clearLabel?: string;
  enterKeyHint?: EnterKeyHint | false;
  /** Element that receives `className`: `"input"` (default) or `"wrapper"`. */
  classNameTarget?: "input" | "wrapper";
}

export interface SearchInputProps extends Omit<ClearInputProps, "leading" | "size"> {
  /** `aria-label`, and the placeholder when `placeholder` is not set. Default `"Search"`. */
  label?: string;
  /** Key hint shown on the right while the value is empty, such as `"/"` or `"⌘K"`. */
  shortcut?: string;
  /** `sm` is `h-8`, `md` is `h-10`. Default `"sm"`. */
  size?: keyof typeof sizeClasses;
  /** `toolbar`: transparent until hover or focus, fixed width from `sm`. Default `"default"`. */
  variant?: keyof typeof variantClasses;
  /** Called after `onChange` whenever the value becomes empty (typed away or cleared). */
  onClear?: () => void;
  /** Classes for the input, merged after `className` when that also targets the input. */
  inputClassName?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      label,
      placeholder,
      clearLabel,
      shortcut,
      size = "sm",
      variant = "default",
      className,
      wrapperClassName,
      inputClassName,
      onClear,
      onChange,
      ...props
    },
    ref,
  ) => {
    const config = useUiConfig("SearchInput");
    const cn = useCn();
    const name = label ?? config?.label ?? "Search";
    const hint = config?.enterKeyHint ?? "search";
    const onWrapper = config?.classNameTarget === "wrapper";
    const showShortcut = Boolean(shortcut) && props.value.length === 0;
    return (
      <ClearInput
        ref={ref}
        aria-label={name === false ? undefined : name}
        placeholder={placeholder ?? config?.placeholder ?? (name === false ? undefined : name)}
        clearLabel={clearLabel ?? config?.clearLabel ?? "Clear search"}
        enterKeyHint={hint === false ? undefined : hint}
        onChange={
          onClear
            ? (next) => {
                onChange(next);
                if (next.length === 0) {
                  onClear();
                }
              }
            : onChange
        }
        wrapperClassName={cn(
          config?.classes?.wrapper,
          variantClasses[variant].wrapper,
          wrapperClassName,
          onWrapper && className,
        )}
        className={cn(
          config?.classes?.input ?? sizeClasses[size].input,
          variantClasses[variant].input,
          showShortcut && "pr-12",
          !onWrapper && className,
          inputClassName,
        )}
        leading={
          <>
            <IconSearch
              size={config?.iconSize ?? 16}
              className={
                config?.classes?.icon ??
                cn(
                  "pointer-events-none absolute top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground",
                  sizeClasses[size].icon,
                )
              }
            />
            {showShortcut ? (
              <Kbd className="absolute right-2 top-1/2 -translate-y-1/2">{shortcut}</Kbd>
            ) : null}
          </>
        }
        {...props}
      />
    );
  },
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
