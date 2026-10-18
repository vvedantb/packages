"use client";

import type { ComponentProps } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "../utils/cn";
import { IconBook, IconChevronDown } from "@tabler/icons-react";

export type SourcesProps = ComponentProps<typeof Collapsible>;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible className={cn("w-full", className)} {...props} />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "group inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-[color,transform] duration-150 ease-out active:scale-[0.97] hover:text-foreground",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        <IconBook className="size-3.5" stroke={1.5} />
        <span>Used {count} sources</span>
        <IconChevronDown className="size-3.5 transition-transform duration-150 ease-out group-data-[state=open]:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent className={cn("mt-2 space-y-2", className)} {...props} />
);

export type SourceProps = ComponentProps<"a">;

export const Source = ({
  href,
  title,
  children,
  className,
  ...props
}: SourceProps) => (
  <a
    className={cn(
      "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.99] hover:bg-surface-secondary hover:text-foreground",
      className,
    )}
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    <span className="line-clamp-1">{children ?? title}</span>
    <IconBook className="size-3.5 shrink-0" stroke={1.5} />
  </a>
);
