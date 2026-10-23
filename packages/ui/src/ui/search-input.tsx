"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";
import { cn } from "../utils/cn";
import { ClearInput, type ClearInputProps } from "./clear-input";
import { Kbd } from "./kbd";

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

export interface SearchInputProps extends Omit<ClearInputProps, "leading" | "size"> {
  /** `aria-label`, and the placeholder when `placeholder` is not set. Default `"Search"`. */
  label?: string;
  /** Key hint shown on the right while the value is empty, such as `"/"` or `"⌘K"`. */
  shortcut?: string;
  /** `sm` is `h-8`, `md` is `h-10`. Default `"sm"`. */
  size?: keyof typeof sizeClasses;
  /** `toolbar`: transparent until hover or focus, fixed width from `sm`. Default `"default"`. */
  variant?: keyof typeof variantClasses;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      label = "Search",
      placeholder,
      clearLabel = "Clear search",
      shortcut,
      size = "sm",
      variant = "default",
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    const showShortcut = Boolean(shortcut) && props.value.length === 0;
    return (
      <ClearInput
        ref={ref}
        aria-label={label}
        placeholder={placeholder ?? label}
        clearLabel={clearLabel}
        enterKeyHint="search"
        wrapperClassName={cn(variantClasses[variant].wrapper, wrapperClassName)}
        className={cn(
          sizeClasses[size].input,
          variantClasses[variant].input,
          showShortcut && "pr-12",
          className,
        )}
        leading={
          <>
            <IconSearch
              size={16}
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground",
                sizeClasses[size].icon,
              )}
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
