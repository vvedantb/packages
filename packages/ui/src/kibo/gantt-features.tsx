"use client";

import dayjs from "../utils/dayjs";
import { DndContext, useDraggable } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCn } from "../ui/ui-config";
import {
  CONTROL_RADIUS_CLASS,
  SURFACE_RADIUS_CLASS,
} from "../utils/surface-radius";
import {
  useGanttContext,
  useGanttClasses,
  getAddRange,
  getOffset,
  getWidth,
  type GanttFeature,
} from "./gantt-provider";
import { useDragSensors } from "../utils/useDragSensors";

export type GanttFeatureDragHelperProps = {
  featureId: GanttFeature["id"];
  direction: "left" | "right";
  date: Date | null;
};

export const GanttFeatureDragHelper: FC<GanttFeatureDragHelperProps> = ({
  direction,
  featureId,
  date,
}) => {
  const gantt = useGanttContext();
  const classes = useGanttClasses();
  const merge = useCn();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `feature-drag-helper-${featureId}`,
  });

  const isPressed = Boolean(attributes["aria-pressed"]);

  useEffect(() => gantt.setDragging(isPressed), [isPressed, gantt]);

  return (
    <div
      className={merge(
        "group -translate-y-1/2 cursor-col-resize absolute top-1/2 z-3 h-full w-6 rounded-md outline-hidden",
        direction === "left" ? "-left-2.5" : "-right-2.5",
      )}
      data-gantt-no-pan
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <div
        className={merge(
          // The handle slides out on hover via translate, not `left`/`right`:
          // an inset animation relayouts every frame, a transform does not.
          // Only opacity and the slide transition, so this stays on the
          // compositor while the user is mid-drag.
          //
          // The named property is `translate`, not `transform`: the slide is
          // `translate-x-*`, which Tailwind compiles to `translate: …`, and an
          // arbitrary `transition-[…]` matches property names literally — so
          // the handle used to appear at its final offset in one frame.
          classes.dragHandle,
          direction === "left" ? "left-0" : "right-0",
          direction === "left" ? "translate-x-2.5" : "-translate-x-2.5",
          "group-hover:translate-x-0",
          isPressed && "translate-x-0",
          "group-hover:opacity-100",
          isPressed && "opacity-100",
        )}
      />
      {date && (
        <div
          className={merge(
            "-translate-x-1/2 absolute top-10 hidden whitespace-nowrap bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg group-hover:block",
            SURFACE_RADIUS_CLASS,
            isPressed && "block",
          )}
        >
          {dayjs(date).format("MMM DD, YYYY")}
        </div>
      )}
    </div>
  );
};

export type GanttFeatureItemCardProps = Pick<GanttFeature, "id"> & {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
};

export const GanttFeatureItemCard: FC<GanttFeatureItemCardProps> = ({
  id,
  children,
  className,
  onClick,
}) => {
  const gantt = useGanttContext();
  const merge = useCn();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes["aria-pressed"]);

  useEffect(() => gantt.setDragging(isPressed), [isPressed, gantt]);

  return (
    <div
      data-gantt-no-pan
      className={merge(
        "relative h-full w-full overflow-hidden border border-border/70 text-xs",
        CONTROL_RADIUS_CLASS,
        className,
      )}
    >
      <div
        className={merge(
          "h-full w-full",
          isPressed ? "cursor-grabbing" : "cursor-grab",
        )}
        {...attributes}
        {...listeners}
        onClick={onClick}
        ref={setNodeRef}
      >
        {children}
      </div>
    </div>
  );
};

export type GanttFeatureItemProps = GanttFeature & {
  onMove?: (id: string, startDate: Date, endDate: Date | null) => void;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
};

export const GanttFeatureItem: FC<GanttFeatureItemProps> = ({
  onMove,
  onClick,
  children,
  className,
  ...feature
}) => {
  const gantt = useGanttContext();
  const classes = useGanttClasses();
  const merge = useCn();
  const timelineStartDate = useMemo(() => {
    const firstYear = gantt.timelineData[0]?.year ?? new Date().getFullYear();
    return new Date(firstYear, 0, 1);
  }, [gantt.timelineData]);

  const [startAt, setStartAt] = useState<Date>(feature.startAt);
  const [endAt, setEndAt] = useState<Date | null>(feature.endAt);

  const width = useMemo(
    () => getWidth(startAt, endAt, gantt),
    [startAt, endAt, gantt],
  );
  const offset = useMemo(
    () => getOffset(startAt, timelineStartDate, gantt),
    [startAt, timelineStartDate, gantt],
  );

  const addRange = useMemo(() => getAddRange(gantt.range), [gantt.range]);

  // Pixels per day for the active range, so drag deltas map to dates correctly
  // in every zoom (daily columns are per-day; monthly/quarterly are per-month).
  const pxPerDay = useMemo(() => {
    const colW = (gantt.columnWidth * gantt.zoom) / 100;
    return gantt.range === "daily" ? colW : colW / 30;
  }, [gantt.columnWidth, gantt.zoom, gantt.range]);

  const [, setPreviousMouseX] = useState(0);
  const [previousStartAt, setPreviousStartAt] = useState(startAt);
  const [previousEndAt, setPreviousEndAt] = useState(endAt);

  // A `MouseSensor` alone meant a gantt bar could not be moved or resized by
  // touch or pen at all — the three `DndContext`s below never armed off a
  // finger.
  const sensors = useDragSensors();

  const handleItemDragStart = useCallback(() => {
    const mouseX = gantt.scrollX;
    setPreviousMouseX(mouseX);
    setPreviousStartAt(startAt);
    setPreviousEndAt(endAt);
  }, [gantt.scrollX, gantt.ref, startAt, endAt]);

  const handleItemDragMove = useCallback(
    (event: { delta: { x: number } }) => {
      const daysDelta = Math.round(event.delta.x / pxPerDay);
      const newStartDate = dayjs(previousStartAt)
        .add(daysDelta, "day")
        .toDate();
      const newEndDate = previousEndAt
        ? dayjs(previousEndAt).add(daysDelta, "day").toDate()
        : null;

      setStartAt(newStartDate);
      setEndAt(newEndDate);
    },
    [pxPerDay, previousStartAt, previousEndAt],
  );

  const onDragEnd = useCallback(
    () => onMove?.(feature.id, startAt, endAt),
    [onMove, feature.id, startAt, endAt],
  );

  const handleLeftDragMove = useCallback(
    (event: { delta: { x: number } }) => {
      const daysDelta = Math.round(event.delta.x / pxPerDay);
      const newStartAt = dayjs(feature.startAt).add(daysDelta, "day").toDate();
      setStartAt(newStartAt);
    },
    [pxPerDay, feature.startAt],
  );

  const handleRightDragMove = useCallback(
    (event: { delta: { x: number } }) => {
      const daysDelta = Math.round(event.delta.x / pxPerDay);
      const newEndAt = dayjs(feature.endAt).add(daysDelta, "day").toDate();
      setEndAt(newEndAt);
    },
    [pxPerDay, feature.endAt],
  );

  // When the bar sits outside the visible canvas, show a clickable date chip
  // pinned to the viewport edge that scrolls back to it (Linear's "← date").
  const viewportWidth = gantt.ref?.current?.clientWidth ?? 0;
  const visibleEnd =
    gantt.scrollX + Math.max(0, viewportWidth - gantt.sidebarWidth);
  const roundedOffset = Math.round(offset);
  const roundedWidth = Math.round(width);
  const offscreenLeft =
    viewportWidth > 0 && roundedOffset + roundedWidth < gantt.scrollX;
  const offscreenRight = viewportWidth > 0 && roundedOffset > visibleEnd;
  const dateLabel = endAt
    ? `${dayjs(startAt).format("MMM D")} – ${dayjs(endAt).format("MMM D")}`
    : dayjs(startAt).format("MMM D");
  const indicatorClass = classes.offscreenIndicator;

  return (
    <div
      className={merge("relative flex w-max min-w-full py-0.5", className)}
      style={{ height: "var(--gantt-row-height)" }}
    >
      <div
        className="pointer-events-auto absolute top-0.5"
        style={{
          height: "calc(var(--gantt-row-height) - 4px)",
          width: Math.round(width),
          left: Math.round(offset),
        }}
      >
        {onMove && (
          <DndContext
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={onDragEnd}
            onDragMove={handleLeftDragMove}
            sensors={sensors}
          >
            <GanttFeatureDragHelper
              date={startAt}
              direction="left"
              featureId={feature.id}
            />
          </DndContext>
        )}
        <DndContext
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={onDragEnd}
          onDragMove={handleItemDragMove}
          onDragStart={handleItemDragStart}
          sensors={sensors}
        >
          <GanttFeatureItemCard id={feature.id} onClick={onClick}>
            {children ?? (
              <div className="flex h-full w-full items-center bg-surface-secondary/40 px-2">
                <p className="flex-1 truncate text-xs">{feature.name}</p>
              </div>
            )}
          </GanttFeatureItemCard>
        </DndContext>
        {onMove && (
          <DndContext
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={onDragEnd}
            onDragMove={handleRightDragMove}
            sensors={sensors}
          >
            <GanttFeatureDragHelper
              date={endAt ?? addRange(startAt, 2)}
              direction="right"
              featureId={feature.id}
            />
          </DndContext>
        )}
      </div>
      {offscreenLeft && (
        <button
          type="button"
          data-gantt-no-pan
          onClick={() => gantt.scrollToFeature?.(feature)}
          className={indicatorClass}
          style={{ left: gantt.scrollX + 8 }}
        >
          <span aria-hidden>←</span>
          {dateLabel}
        </button>
      )}
      {offscreenRight && (
        <button
          type="button"
          data-gantt-no-pan
          onClick={() => gantt.scrollToFeature?.(feature)}
          className={merge(indicatorClass, "-translate-x-full")}
          style={{
            left:
              gantt.scrollX +
              Math.max(0, viewportWidth - gantt.sidebarWidth) -
              8,
          }}
        >
          {dateLabel}
          <span aria-hidden>→</span>
        </button>
      )}
    </div>
  );
};

export type GanttFeatureListGroupProps = {
  children: ReactNode;
  className?: string;
};

export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({
  children,
  className,
}) => (
  <div className={className} style={{ paddingTop: "var(--gantt-row-height)" }}>
    {children}
  </div>
);

export type GanttFeatureRowProps = {
  features: GanttFeature[];
  onMove?: (id: string, startAt: Date, endAt: Date | null) => void;
  children?: (feature: GanttFeature) => ReactNode;
  className?: string;
};

export const GanttFeatureRow: FC<GanttFeatureRowProps> = ({
  features,
  onMove,
  children,
  className,
}) => {
  const sortedFeatures = [...features].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );

  const featureWithPositions: (GanttFeature & { subRow: number })[] = [];
  const subRowEndTimes: Date[] = [];

  for (const feature of sortedFeatures) {
    let subRow = 0;
    while ((subRowEndTimes[subRow] ?? feature.startAt) > feature.startAt) {
      subRow++;
    }

    if (subRow === subRowEndTimes.length) {
      subRowEndTimes.push(feature.endAt);
    } else {
      subRowEndTimes[subRow] = feature.endAt;
    }

    featureWithPositions.push({ ...feature, subRow });
  }

  const merge = useCn();
  const maxSubRows = Math.max(1, subRowEndTimes.length);
  const subRowHeight = 36;

  return (
    <div
      className={merge("relative", className)}
      style={{
        height: `${maxSubRows * subRowHeight}px`,
        minHeight: "var(--gantt-row-height)",
      }}
    >
      {featureWithPositions.map((feature) => (
        <div
          className="absolute w-full"
          key={feature.id}
          style={{
            top: `${feature.subRow * subRowHeight}px`,
            height: `${subRowHeight}px`,
          }}
        >
          <GanttFeatureItem {...feature} onMove={onMove}>
            {children ? (
              children(feature)
            ) : (
              <p className="flex-1 truncate text-xs">{feature.name}</p>
            )}
          </GanttFeatureItem>
        </div>
      ))}
    </div>
  );
};

export type GanttFeatureListProps = {
  className?: string;
  children: ReactNode;
};

export const GanttFeatureList: FC<GanttFeatureListProps> = ({
  className,
  children,
}) => {
  const merge = useCn();
  return (
    <div
      className={merge("absolute top-0 left-0 h-full w-max", className)}
      style={{ marginTop: "var(--gantt-header-height)" }}
    >
      {children}
    </div>
  );
};
