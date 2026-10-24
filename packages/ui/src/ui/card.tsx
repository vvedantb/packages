import * as React from "react";
import { useCn, useUiConfig } from "./ui-config";

export interface CardConfig {
  /** Replaces the built-in classes of a part. A part left out keeps its default. */
  classes?: {
    root?: string;
    header?: string;
    title?: string;
    description?: string;
    content?: string;
    footer?: string;
    action?: string;
  };
}

/** The app's class string for `part` (else `fallback`), merged with the caller `className`. */
function useCardClass(
  part: keyof NonNullable<CardConfig["classes"]>,
  fallback: string,
  className: string | undefined,
): string {
  const merge = useCn();
  return merge(useUiConfig("Card")?.classes?.[part] ?? fallback, className);
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={useCardClass("root", "rounded-lg bg-surface-card text-surface-foreground", className)}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={useCardClass("header", "flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={useCardClass("title", "font-semibold leading-none tracking-[-0.02em]", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={useCardClass("description", "text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={useCardClass("content", "p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={useCardClass("footer", "flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

/** Top-right slot of a grid header (`grid-cols-[1fr_auto]`): spans the title and description rows. */
const CardAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={useCardClass("action", "col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
    {...props}
  />
));
CardAction.displayName = "CardAction";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction };
