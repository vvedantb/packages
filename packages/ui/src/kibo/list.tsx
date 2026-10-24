"use client";

import {
  DndContext,
  type DragEndEvent,
  rectIntersection,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import type { ReactNode } from "react";
import { useCn } from "../ui/ui-config";
import { useDragSensors } from "../utils/useDragSensors";

export type { DragEndEvent as SortableListDragEndEvent } from "@dnd-kit/core";

export type SortableListItemsProps = {
  children: ReactNode;
  className?: string;
};

export const SortableListItems = ({ children, className }: SortableListItemsProps) => {
  const merge = useCn();
  return (
    <div className={merge("flex flex-1 flex-col gap-0.5", className)}>
      {children}
    </div>
  );
};

export type SortableListHeaderProps =
  | {
      children: ReactNode;
    }
  | {
      name: string;
      color: string;
      className?: string;
    };

export const SortableListHeader = (props: SortableListHeaderProps) => {
  const merge = useCn();
  return "children" in props ? (
    props.children
  ) : (
    <div
      className={merge(
        "flex shrink-0 items-center gap-2 bg-foreground/5 p-3",
        props.className,
      )}
    >
      <div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: props.color }}
      />
      <p className="m-0 font-semibold text-sm">{props.name}</p>
    </div>
  );
};

export type SortableListGroupProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export const SortableListGroup = ({ id, children, className }: SortableListGroupProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const merge = useCn();

  return (
    <div
      className={merge(
        "transition-colors",
        isOver && "bg-surface-secondary/40",
        className,
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
};

export type SortableListItemProps = {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly parent: string;
  readonly children?: ReactNode;
  readonly className?: string;
};

// Not built on `ListRow`: that row always wraps its children in a padded body
// `<div>` and adds its own surface, radius and hover, so rendering through it
// would change this item's DOM for every caller. This item is only the draggable box.
export const SortableListItem = ({
  id,
  name,
  index,
  parent,
  children,
  className,
}: SortableListItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { index, parent },
    });
  const merge = useCn();

  return (
    <div
      className={merge(
        "cursor-grab",
        isDragging && "cursor-grabbing opacity-50",
        className,
      )}
      style={{
        transform: transform
          ? `translateX(${transform.x}px) translateY(${transform.y}px)`
          : "none",
      }}
      {...listeners}
      {...attributes}
      ref={setNodeRef}
    >
      {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
    </div>
  );
};

export type SortableListProviderProps = {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  className?: string;
};

export const SortableListProvider = ({
  children,
  onDragEnd,
  className,
}: SortableListProviderProps) => {
  // A lone `PointerSensor` armed on distance meant the list could not be
  // reordered by touch at all: the whole row is the drag handle, the drag is
  // restricted to the vertical axis, and that is the same axis the finger
  // scrolls on — so the browser claimed the gesture and cancelled the pointer
  // every time.
  const sensors = useDragSensors();
  const merge = useCn();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <div className={merge("flex size-full flex-col", className)}>{children}</div>
    </DndContext>
  );
};
