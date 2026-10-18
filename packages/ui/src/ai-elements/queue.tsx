"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../utils/cn";
import {
  flatPanelSubtleClass,
  flatPanelSubtleHoverClass,
} from "../ui/surface-classes";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import {
  IconChevronDown,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconStack2,
} from "@tabler/icons-react";

export interface QueueProps {
  className?: string;
  children?: ReactNode;
  count: number;
}

export function Queue({ className, children, count }: QueueProps) {
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

export interface QueueListProps {
  className?: string;
  children?: ReactNode;
  open?: boolean;
}

export function QueueList({
  className,
  children,
  open = true,
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
          <div className={cn(flatPanelSubtleClass, "rounded-b-2xl", className)}>
            <ScrollArea className="max-h-[240px]">
              <div className="p-2 space-y-1.5">{children}</div>
            </ScrollArea>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

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

export function QueueItem({
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
