import * as React from "react";
import { useCn, useUiConfig } from "./ui-config";

export interface TableConfig {
  /** Replaces the built-in classes of a part. A part left out keeps its default. */
  classes?: {
    /** The scroll wrapper `<div>` around the `<table>`. */
    wrapper?: string;
    table?: string;
    header?: string;
    body?: string;
    footer?: string;
    row?: string;
    head?: string;
    cell?: string;
    caption?: string;
  };
}

/** The app's class string for `part` (else `fallback`), merged with the caller `className`. */
function useTableClass(
  part: keyof NonNullable<TableConfig["classes"]>,
  fallback: string,
  className: string | undefined,
): string {
  const merge = useCn();
  return merge(useUiConfig("Table")?.classes?.[part] ?? fallback, className);
}

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className={useUiConfig("Table")?.classes?.wrapper ?? "relative w-full overflow-auto rounded-lg max-sm:min-w-0 max-sm:max-w-full"}>
    <table
      ref={ref}
      className={useTableClass("table", "w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={useTableClass("header", "[&_tr]:border-b [&_tr]:border-separator", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={useTableClass("body", "[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={useTableClass("footer", "border-t border-separator bg-surface-secondary/30 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={useTableClass(
      "row",
      "border-b border-separator transition-colors duration-200 ease-smooth hover:bg-surface-tertiary/50 data-[state=selected]:bg-surface-secondary",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={useTableClass(
      "head",
      "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-widest text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={useTableClass("cell", "p-4 align-middle text-sm [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={useTableClass("caption", "mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
