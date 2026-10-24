"use client";

import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../utils/cn";
import {
  flatPanelSubtleClass,
  flatPanelSubtleHoverClass,
} from "../ui/surface-classes";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { useCn, useUiConfig } from "../ui/ui-config";
import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconStack2,
} from "@tabler/icons-react";

// One Queue family, used in one of two ways:
// - The queued-messages widget: `Queue` with `count`, `QueueHeader`,
//   `QueueList` and `QueueItem` with `text`. It animates with `motion.*`.
// - Composable parts (the AI Elements `Queue`): `Queue` without `count`, the
//   `QueueSection*` parts, `QueueList`, `QueueItem` with children and the
//   `QueueItem*` parts. Plain elements only, no `motion.*`, so it renders
//   under a strict `LazyMotion`.
// `QueueList` inside a composable `Queue` is the plain list; anywhere else it
// is the widget's animated list.
//
// The widget keeps its own markup: its rows, actions and list have other
// elements and classes than the parts, so building it on them would change
// its DOM.

/** `UiConfig.Queue`: `classes.sectionTrigger` replaces the section header's classes. */
export interface QueueConfig {
  classes?: {
    sectionTrigger?: string;
  };
}

/** True inside a composable `Queue` (one without `count`). */
const QueuePartsContext = createContext(false);

/** The queued-messages widget: animates in while `count > 0`. */
export interface QueueProps {
  className?: string;
  children?: ReactNode;
  count: number;
}

/** The composable root: a plain container for `QueueSection`s. */
export type QueueDivProps = ComponentProps<"div"> & { count?: never };

/**
 * With `count`, the queued-messages widget. Without it, the root container
 * of a collapsible queue of pending items.
 */
export function Queue(props: QueueProps | QueueDivProps) {
  if (props.count === undefined) return <QueueRoot {...props} />;
  return <QueueWidget {...props} />;
}

function QueueRoot({ className, count: _count, ...props }: QueueDivProps) {
  const merge = useCn();
  return (
    <QueuePartsContext.Provider value>
      <div
        className={merge(
          "flex flex-col rounded-xl border border-border bg-card/40 px-2.5 py-2",
          className,
        )}
        {...props}
      />
    </QueuePartsContext.Provider>
  );
}

function QueueWidget({ className, children, count }: QueueProps) {
  return (
    <AnimatePresence initial={false}>
      {count > 0 ? (
        <motion.div
          key="queue"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className={cn("w-full overflow-hidden", className)}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export interface QueueHeaderProps {
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

/** The widget's header: a toggle with the message count. */
export function QueueHeader({
  count,
  isOpen,
  onToggle,
  className,
}: QueueHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center justify-between w-full",
        "px-4 py-2.5",
        flatPanelSubtleClass,
        flatPanelSubtleHoverClass,
        "rounded-t-2xl",
        "group",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <IconStack2 size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Queued Messages
        </span>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>
      <IconChevronDown
        size={16}
        className={cn(
          "text-muted-foreground transition-transform duration-200 ease-out",
          isOpen && "rotate-180",
        )}
      />
    </button>
  );
}

export interface QueueListProps extends ComponentProps<"div"> {
  /** Widget list only: animates the list in and out. Default `true`. */
  open?: boolean;
}

/**
 * Inside a composable `Queue`, a scrollable list capped at `max-h-48`.
 * Anywhere else, the widget's animated list capped at 240px.
 */
export function QueueList({ open = true, ...props }: QueueListProps) {
  const inParts = useContext(QueuePartsContext);
  if (inParts) return <QueuePartsList {...props} />;
  return <QueueWidgetList open={open} {...props} />;
}

function QueuePartsList({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  const merge = useCn();
  return (
    <div className={merge("mt-1", className)} {...props}>
      <div className="max-h-48 overflow-y-auto">
        <ul className="flex flex-col gap-1">{children}</ul>
      </div>
    </div>
  );
}

function QueueWidgetList({
  className,
  children,
  open,
  ...props
}: QueueListProps) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="queue-list"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className="overflow-hidden"
        >
          <div
            className={cn(flatPanelSubtleClass, "rounded-b-2xl", className)}
            {...props}
          >
            <ScrollArea className="max-h-[240px]">
              <div className="p-2 space-y-1.5">{children}</div>
            </ScrollArea>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** A widget row: one queued message with edit and remove. */
export interface QueueItemProps {
  text: string;
  model?: string;
  personalityName?: string;
  personaName?: string;
  personaImage?: string;
  onEdit: (newText: string) => void;
  onRemove: () => void;
  className?: string;
}

/** A composable row: an `li` for your own content and the `QueueItem*` parts. */
export type QueueItemLiProps = ComponentProps<"li"> & { text?: never };

/** With `text`, a widget row. Without it, a plain `li` row. */
export function QueueItem(props: QueueItemProps | QueueItemLiProps) {
  if (props.text === undefined) return <QueuePartsItem {...props} />;
  return <QueueWidgetItem {...props} />;
}

function QueuePartsItem({ className, text: _text, ...props }: QueueItemLiProps) {
  const merge = useCn();
  return (
    <li
      className={merge(
        "group flex flex-col gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-secondary/50",
        className,
      )}
      {...props}
    />
  );
}

function QueueWidgetItem({
  text,
  model,
  personalityName,
  personaName,
  personaImage,
  onEdit,
  onRemove,
  className,
}: QueueItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(text);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative",
        "p-2.5 rounded-lg",
        "transition-[background-color,transform] duration-150 ease-out active:scale-[0.99] hover:bg-surface-secondary",
        className,
      )}
    >
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.currentTarget.value)}
            className="min-h-[60px] text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              className="h-7 px-2"
            >
              <IconX size={14} />
              <span className="ml-1 text-xs">Cancel</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={!editText.trim()}
              className="h-7 px-2"
            >
              <IconCheck size={14} />
              <span className="ml-1 text-xs">Save</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {personaImage && (
            <img
              src={personaImage}
              alt={personaName || "Persona"}
              className="size-5 rounded-full shrink-0"
            />
          )}
          <p className="text-sm text-foreground/90 flex-1 truncate">{text}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {model && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {model.split("/").pop()}
              </Badge>
            )}
            {personalityName && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {personalityName}
              </Badge>
            )}
            {personaName && !personaImage && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {personaName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0"
            >
              <IconEdit size={13} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-danger hover:text-danger"
            >
              <IconTrash size={13} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const sectionTrigger = useUiConfig("Queue")?.classes?.sectionTrigger;
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
        "size-auto rounded-md p-1 text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
        className,
      )}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    />
  );
};
