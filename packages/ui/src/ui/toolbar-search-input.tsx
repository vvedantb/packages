import * as React from "react";
import { SearchInput } from "./search-input";

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

/** @deprecated Use `<SearchInput variant="toolbar">`. */
export const ToolbarSearchInput = React.forwardRef<HTMLInputElement, ToolbarSearchInputProps>(
  function ToolbarSearchInput(
    { placeholder = "Search...", className, inputClassName, ...props },
    ref,
  ) {
    return (
      <SearchInput
        ref={ref}
        variant="toolbar"
        placeholder={placeholder}
        wrapperClassName={className}
        className={inputClassName}
        {...props}
      />
    );
  },
);
