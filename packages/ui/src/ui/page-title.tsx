import * as React from "react";
import { cn } from "../utils/cn";

/** The page title class contract: Instrument Sans (the sans token), 20px, weight 600, never lighter. Same string as `Breadcrumb`. */
export const pageTitleClass = "text-xl font-semibold leading-tight tracking-tight";

/** Page title: `h1`, `text-xl font-semibold leading-tight tracking-tight`. */
const PageTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h1 ref={ref} className={cn(pageTitleClass, className)} {...props} />,
);
PageTitle.displayName = "PageTitle";

export type PageHeaderProps = Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  /** Title text or node, rendered in `PageTitle`. */
  title: React.ReactNode;
  /** Right-aligned slot, for example a button. */
  action?: React.ReactNode;
};

/** Title row: `PageTitle` with an optional `action` slot. No safe-area padding (web). */
const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(({ title, action, className, ...props }, ref) => (
  <header ref={ref} className={cn("flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-6", className)} {...props}>
    <PageTitle className="min-w-0 truncate">{title}</PageTitle>
    {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
  </header>
));
PageHeader.displayName = "PageHeader";

export { PageHeader, PageTitle };
