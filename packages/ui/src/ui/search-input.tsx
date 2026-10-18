"use client";

import * as React from "react";
import { IconSearch } from "@tabler/icons-react";
import { cn } from "../utils/cn";
import { ClearInput, type ClearInputProps } from "./clear-input";

export type SearchInputProps = Omit<ClearInputProps, "leading">;

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <ClearInput
        ref={ref}
        className={cn("h-8 pl-8 text-sm", className)}
        leading={
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground"
          />
        }
        {...props}
      />
    );
  },
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
