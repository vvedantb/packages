import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

// The `Alt` look on the main parts: per-instance `classes` replace the main
// classes (and any `UiConfig.Accordion` entry), and `data-slot={undefined}`
// drops the main `data-slot` attributes, so the markup is the pre-wrapper one.

/** @deprecated Use `Accordion`. Kept for existing consumers; removed in a later minor after they move. */
function AccordionAlt(props: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <Accordion data-slot={undefined} {...props} />;
}

/** @deprecated Use `AccordionItem`. Kept for existing consumers; removed in a later minor after they move. */
function AccordionItemAlt(props: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionItem data-slot={undefined} classes={{ item: "rounded-lg" }} {...props} />;
}

const triggerClasses = {
  header: "flex",
  trigger:
    "flex flex-1 items-center justify-between rounded-lg py-4 text-sm font-medium transition-[background-color,color,transform] duration-100 ease-out active:scale-[0.99] hover:bg-surface-tertiary/50 [&[data-state=open]>svg]:rotate-180",
};

/** @deprecated Use `AccordionTrigger`. Kept for existing consumers; removed in a later minor after they move. */
function AccordionTriggerAlt(props: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionTrigger
      data-slot={undefined}
      classes={triggerClasses}
      icon={<IconChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />}
      {...props}
    />
  );
}

const contentClasses = {
  content:
    "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
  contentInner: "pb-4 pt-0 text-muted-foreground",
};

/** @deprecated Use `AccordionContent`. Kept for existing consumers; removed in a later minor after they move. */
function AccordionContentAlt(props: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionContent data-slot={undefined} classes={contentClasses} {...props} />;
}

export { AccordionAlt, AccordionItemAlt, AccordionTriggerAlt, AccordionContentAlt };
