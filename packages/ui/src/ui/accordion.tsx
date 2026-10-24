import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { useCn, useUiConfig } from "./ui-config";

type AccordionClasses = {
  item?: string;
  header?: string;
  trigger?: string;
  content?: string;
  contentInner?: string;
};

/**
 * `UiConfig.Accordion`: `classes` replace the built-in part classes
 * (`content` is the animated panel, `contentInner` the padded box inside it);
 * `icon` is the default for the `AccordionTrigger` prop. Each part also takes
 * a `classes` prop with its own keys, which wins over the config.
 */
export interface AccordionConfig {
  classes?: AccordionClasses;
  icon?: React.ReactNode;
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  classes,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item> & {
  /** Replaces the item classes for this instance (wins over `UiConfig.Accordion.classes.item`). */
  classes?: Pick<AccordionClasses, "item">;
}) {
  const config = useUiConfig("Accordion")?.classes;
  const item = classes?.item ?? config?.item;
  const cn = useCn();
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(item ?? "not-first:mt-6", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  icon,
  classes,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  /** Shown after the children. Default a chevron. */
  icon?: React.ReactNode;
  /** Replaces the header and trigger classes for this instance (wins over `UiConfig.Accordion.classes`). */
  classes?: Pick<AccordionClasses, "header" | "trigger">;
}) {
  const config = useUiConfig("Accordion");
  const cn = useCn();
  return (
    <AccordionPrimitive.Header className={classes?.header ?? config?.classes?.header ?? "flex"}>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          classes?.trigger ??
            config?.classes?.trigger ??
            "flex flex-1 items-center justify-between py-4 font-medium transition-[color,transform] duration-150 ease-out active:scale-[0.99] hover:underline [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        {icon ?? config?.icon ?? (
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-150 ease-out" />
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  classes,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content> & {
  /** Replaces the panel and inner box classes for this instance (wins over `UiConfig.Accordion.classes`). */
  classes?: Pick<AccordionClasses, "content" | "contentInner">;
}) {
  const config = useUiConfig("Accordion")?.classes;
  const cn = useCn();
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={
        classes?.content ??
        config?.content ??
        "overflow-hidden text-sm transition-[height] data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      }
      {...props}
    >
      <div className={cn(classes?.contentInner ?? config?.contentInner ?? "pb-4 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
