import type * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { useCn, useUiConfig } from "./ui-config";

/**
 * `UiConfig.Collapsible`: classes for the trigger and the content (for
 * example an app's open/close animation class). The parts have no built-in
 * classes, so without an entry `className` passes through untouched.
 */
export interface CollapsibleConfig {
  classes?: { trigger?: string; content?: string };
}

const Collapsible = CollapsiblePrimitive.Root;

function CollapsibleTrigger({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  const trigger = useUiConfig("Collapsible")?.classes?.trigger;
  const cn = useCn();
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      className={trigger === undefined ? className : cn(trigger, className)}
      {...props}
    />
  );
}

export type CollapsibleContentProps = React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleContent
>;

function CollapsibleContent({ className, ...props }: CollapsibleContentProps) {
  const content = useUiConfig("Collapsible")?.classes?.content;
  const cn = useCn();
  return (
    <CollapsiblePrimitive.CollapsibleContent
      className={content === undefined ? className : cn(content, className)}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
