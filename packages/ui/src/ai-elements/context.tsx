"use client";

import type { ComponentProps } from "react";
import { createContext, useContext, useMemo } from "react";

import { Button } from "../ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { Progress } from "../ui/progress";
import { useCn } from "../ui/ui-config";
import { m } from "motion/react";
import { springTransition } from "../motion/presets";
import { RollingNumber } from "../ui/rolling-number";

const PERCENT_MAX = 100;
const ICON_RADIUS = 10;
const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_STROKE_WIDTH = 2;

/**
 * Per-category token counts. Cache reads and writes are priced very differently
 * (reads ~0.1x input, writes ~1.25x input), so they are tracked separately.
 */
interface LanguageModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputReadTokens?: number;
  cachedInputWriteTokens?: number;
}

/**
 * Pre-computed costs (USD). Pass these when the authoritative cost is known
 * (e.g. Claude returns `total_cost_usd` directly). Avoids needing a pricing
 * catalog at render time.
 */
interface ContextCosts {
  totalUSD?: number;
  inputUSD?: number;
  outputUSD?: number;
  cacheReadUSD?: number;
  cacheWriteUSD?: number;
}

interface ContextSchema {
  usedTokens: number;
  maxTokens: number;
  usage?: LanguageModelUsage;
  costs?: ContextCosts;
}

const ContextContext = createContext<ContextSchema | null>(null);

const useContextValue = () => {
  const context = useContext(ContextContext);

  if (!context) {
    throw new Error("ContextUsage components must be used within ContextUsage");
  }

  return context;
};

export type ContextUsageProps = ComponentProps<typeof HoverCard> & ContextSchema;

export const ContextUsage = ({
  usedTokens,
  maxTokens,
  usage,
  costs,
  ...props
}: ContextUsageProps) => {
  const contextValue = useMemo(
    () => ({ costs, maxTokens, usage, usedTokens }),
    [costs, maxTokens, usage, usedTokens],
  );

  return (
    <ContextContext.Provider value={contextValue}>
      <HoverCard closeDelay={0} openDelay={0} {...props} />
    </ContextContext.Provider>
  );
};

const ContextIcon = () => {
  const { usedTokens, maxTokens } = useContextValue();
  const circumference = 2 * Math.PI * ICON_RADIUS;
  const usedPercent = maxTokens > 0 ? usedTokens / maxTokens : 0;
  const dashOffset = circumference * (1 - Math.min(usedPercent, 1));

  return (
    <svg
      aria-label="Model context usage"
      height="16"
      role="img"
      style={{ color: "currentcolor" }}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width="16"
    >
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.25"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <m.circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.7"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeDasharray={`${circumference} ${circumference}`}
        initial={false}
        animate={{ strokeDashoffset: dashOffset }}
        transition={springTransition}
        strokeLinecap="round"
        strokeWidth={ICON_STROKE_WIDTH}
        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
      />
    </svg>
  );
};

export type ContextUsageTriggerProps = ComponentProps<typeof Button>;

export const ContextUsageTrigger = ({ children, ...props }: ContextUsageTriggerProps) => {
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = maxTokens > 0 ? usedTokens / maxTokens : 0;
  const renderedPercent = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(usedPercent);

  return (
    <HoverCardTrigger asChild>
      {children ?? (
        <Button type="button" variant="ghost" size="sm" {...props}>
          <RollingNumber
            value={renderedPercent}
            className="font-medium text-muted-foreground text-xs"
          />
          <ContextIcon />
        </Button>
      )}
    </HoverCardTrigger>
  );
};

export type ContextUsageContentProps = ComponentProps<typeof HoverCardContent>;

export const ContextUsageContent = ({
  className,
  ...props
}: ContextUsageContentProps) => {
  const merge = useCn();
  return (
    <HoverCardContent
      className={merge("min-w-60 divide-y overflow-hidden p-0", className)}
      {...props}
    />
  );
};

export type ContextUsageContentHeaderProps = ComponentProps<"div">;

export const ContextUsageContentHeader = ({
  children,
  className,
  ...props
}: ContextUsageContentHeaderProps) => {
  const merge = useCn();
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = maxTokens > 0 ? usedTokens / maxTokens : 0;
  const displayPct = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(usedPercent);
  const used = new Intl.NumberFormat("en-US", {
    notation: "compact",
  }).format(usedTokens);
  const total = new Intl.NumberFormat("en-US", {
    notation: "compact",
  }).format(maxTokens);

  return (
    <div className={merge("w-full space-y-2 p-3", className)} {...props}>
      {children ?? (
        <>
          <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
            <RollingNumber value={displayPct} />
            <p className="font-mono text-muted-foreground">
              <RollingNumber value={used} /> / {total}
            </p>
          </div>
          <div className="space-y-2">
            <Progress className="bg-surface-secondary" value={usedPercent * PERCENT_MAX} />
          </div>
        </>
      )}
    </div>
  );
};

export type ContextUsageContentBodyProps = ComponentProps<"div">;

export const ContextUsageContentBody = ({
  children,
  className,
  ...props
}: ContextUsageContentBodyProps) => {
  const merge = useCn();
  return (
    <div className={merge("w-full p-3", className)} {...props}>
      {children}
    </div>
  );
};

const formatUSD = (value: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    // Claude's per-call cost is often sub-cent; show enough precision to be useful.
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);

const formatTokens = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);

export type ContextUsageContentFooterProps = ComponentProps<"div">;

export const ContextUsageContentFooter = ({
  children,
  className,
  ...props
}: ContextUsageContentFooterProps) => {
  const merge = useCn();
  const { costs } = useContextValue();
  const totalCost = costs?.totalUSD;

  return (
    <div
      className={merge(
        "flex w-full items-center justify-between gap-3 bg-secondary p-3 text-xs",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="text-muted-foreground">Total cost</span>
          <RollingNumber
            value={totalCost === undefined ? "—" : formatUSD(totalCost)}
            className="font-mono"
          />
        </>
      )}
    </div>
  );
};

const UsageRow = ({
  label,
  tokens,
  costUSD,
  className,
  ...rest
}: {
  label: string;
  tokens: number;
  costUSD?: number;
} & ComponentProps<"div">) => {
  const merge = useCn();
  if (!tokens) return null;
  return (
    <div
      className={merge("flex items-center justify-between text-xs", className)}
      {...rest}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-baseline">
        <RollingNumber value={formatTokens(tokens)} />
        {costUSD !== undefined ? (
          <RollingNumber
            value={formatUSD(costUSD)}
            className="ml-2 font-mono text-muted-foreground"
          />
        ) : null}
      </span>
    </div>
  );
};

export type ContextUsageInputProps = ComponentProps<"div">;

export const ContextUsageInput = (props: ContextUsageInputProps) => {
  const { usage, costs } = useContextValue();
  return (
    <UsageRow
      label="Input"
      tokens={usage?.inputTokens ?? 0}
      costUSD={costs?.inputUSD}
      {...props}
    />
  );
};

export type ContextUsageOutputProps = ComponentProps<"div">;

export const ContextUsageOutput = (props: ContextUsageOutputProps) => {
  const { usage, costs } = useContextValue();
  return (
    <UsageRow
      label="Output"
      tokens={usage?.outputTokens ?? 0}
      costUSD={costs?.outputUSD}
      {...props}
    />
  );
};

export type ContextUsageCacheReadProps = ComponentProps<"div">;

export const ContextUsageCacheRead = (props: ContextUsageCacheReadProps) => {
  const { usage, costs } = useContextValue();
  return (
    <UsageRow
      label="Cache read"
      tokens={usage?.cachedInputReadTokens ?? 0}
      costUSD={costs?.cacheReadUSD}
      {...props}
    />
  );
};

export type ContextUsageCacheWriteProps = ComponentProps<"div">;

export const ContextUsageCacheWrite = (props: ContextUsageCacheWriteProps) => {
  const { usage, costs } = useContextValue();
  return (
    <UsageRow
      label="Cache write"
      tokens={usage?.cachedInputWriteTokens ?? 0}
      costUSD={costs?.cacheWriteUSD}
      {...props}
    />
  );
};

/**
 * @deprecated Use ContextUsageCacheRead and ContextUsageCacheWrite separately.
 * Kept for backwards compat — shows combined cache reads + writes as one row.
 */
export const ContextUsageCache = (props: ComponentProps<"div">) => {
  const { usage, costs } = useContextValue();
  const cacheTokens =
    (usage?.cachedInputReadTokens ?? 0) + (usage?.cachedInputWriteTokens ?? 0);
  const cacheCost =
    costs?.cacheReadUSD !== undefined || costs?.cacheWriteUSD !== undefined
      ? (costs?.cacheReadUSD ?? 0) + (costs?.cacheWriteUSD ?? 0)
      : undefined;
  return (
    <UsageRow
      label="Cache"
      tokens={cacheTokens}
      costUSD={cacheCost}
      {...props}
    />
  );
};
