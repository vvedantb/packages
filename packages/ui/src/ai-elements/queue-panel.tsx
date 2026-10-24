"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { IconChevronRight } from "@tabler/icons-react";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { useCn, useUiConfig } from "../ui/ui-config";

// A composable queue of pending items in collapsible sections (the AI Elements
// `Queue` parts). `Queue`, `QueueList` and `QueueItem` are taken by the
// queued-messages widget in `queue.tsx`, so the root, list and row are
// `QueuePanel`, `QueuePanelList` and `QueuePanelItem`.

/** `UiConfig.QueuePanel`: `classes.sectionTrigger` replaces the section header's classes. */
export interface QueuePanelConfig {
  classes?: {
    sectionTrigger?: string;
  };
}

export type QueuePanelProps = ComponentProps<"div">;

/** Root container for a collapsible queue of pending items. */
export const QueuePanel = ({ className, ...props }: QueuePanelProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        "flex flex-col rounded-xl border border-border bg-card/40 px-2.5 py-2",
        className,
      )}
      {...props}
    />
  );
};

export type QueueSectionProps = ComponentProps<typeof Collapsible>;

export const QueueSection = ({
  className,
  defaultOpen = true,
  ...props
}: QueueSectionProps) => {
  const merge = useCn();
  return <Collapsible className={merge(className)} defaultOpen={defaultOpen} {...props} />;
};

export type QueueSectionTriggerProps = ComponentProps<"button">;

export const QueueSectionTrigger = ({
  children,
  className,
  ...props
}: QueueSectionTriggerProps) => {
  const sectionTrigger = useUiConfig("QueuePanel")?.classes?.sectionTrigger;
  const merge = useCn();
  return (
    <CollapsibleTrigger asChild>
      <button
        className={merge(
          sectionTrigger ??
            "group flex w-full items-center rounded-md px-1 py-1 text-left text-xs font-medium text-muted-foreground transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.99]",
          className,
        )}
        type="button"
        {...props}
      >
        {children}
      </button>
    </CollapsibleTrigger>
  );
};

export type QueueSectionLabelProps = ComponentProps<"span"> & {
  count?: number;
  label: string;
  icon?: ReactNode;
};

export const QueueSectionLabel = ({
  count,
  label,
  icon,
  className,
  ...props
}: QueueSectionLabelProps) => {
  const merge = useCn();
  return (
    <span className={merge("flex items-center gap-1.5", className)} {...props}>
      {icon}
      <span>
        {count} {label}
      </span>
      {/* After the text, pointing right, turning 90° when the section is open. */}
      <IconChevronRight className="-ml-0.5 size-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-90" />
    </span>
  );
};

export type QueueSectionContentProps = ComponentProps<
  typeof CollapsibleContent
>;

export const QueueSectionContent = ({
  className,
  ...props
}: QueueSectionContentProps) => {
  const merge = useCn();
  return <CollapsibleContent className={merge(className)} {...props} />;
};

export type QueuePanelListProps = ComponentProps<"div">;

/** Scrollable list wrapper, capped at `max-h-48`. */
export const QueuePanelList = ({
  children,
  className,
  ...props
}: QueuePanelListProps) => {
  const merge = useCn();
  return (
    <div className={merge("mt-1", className)} {...props}>
      <div className="max-h-48 overflow-y-auto">
        <ul className="flex flex-col gap-1">{children}</ul>
      </div>
    </div>
  );
};

export type QueuePanelItemProps = ComponentProps<"li">;

export const QueuePanelItem = forwardRef<HTMLLIElement, QueuePanelItemProps>(
  ({ className, ...props }, ref) => {
    const merge = useCn();
    return (
      <li
        ref={ref}
        className={merge(
          "group flex flex-col gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50",
          className,
        )}
        {...props}
      />
    );
  },
);
QueuePanelItem.displayName = "QueuePanelItem";

export type QueueItemIndicatorProps = ComponentProps<"span"> & {
  completed?: boolean;
};

export const QueueItemIndicator = ({
  completed = false,
  className,
  ...props
}: QueueItemIndicatorProps) => {
  const merge = useCn();
  return (
    <span
      className={merge(
        "mt-1 inline-block size-2.5 shrink-0 rounded-full border",
        completed
          ? "border-muted-foreground/20 bg-muted-foreground/10"
          : "border-muted-foreground/45",
        className,
      )}
      {...props}
    />
  );
};

export type QueueItemContentProps = ComponentProps<"span"> & {
  completed?: boolean;
};

export const QueueItemContent = ({
  completed = false,
  className,
  ...props
}: QueueItemContentProps) => {
  const merge = useCn();
  return (
    <span
      className={merge(
        "line-clamp-2 min-w-0 grow wrap-break-word leading-snug",
        completed
          ? "text-muted-foreground/50 line-through"
          : "text-foreground/90",
        className,
      )}
      {...props}
    />
  );
};

export type QueueItemActionsProps = ComponentProps<"div">;

export const QueueItemActions = ({
  className,
  ...props
}: QueueItemActionsProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        // `reveal-on-hover`: hidden until row hover on pointer devices, always
        // visible below `sm` where there is no hover.
        "flex shrink-0 items-start gap-0.5 reveal-on-hover transition-opacity",
        className,
      )}
      {...props}
    />
  );
};

export type QueueItemActionProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size"
>;

export const QueueItemAction = ({
  className,
  ...props
}: QueueItemActionProps) => {
  const merge = useCn();
  return (
    <Button
      className={merge(
        "size-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    />
  );
};
