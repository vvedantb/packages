"use client";

import type { ComponentProps, HTMLAttributes } from "react";
import { createContext, useContext, useMemo } from "react";
import {
  IconCircleCheck,
  IconChevronRight,
  IconCircleDot,
  IconCircle,
  IconCircleX,
} from "@tabler/icons-react";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { useCn } from "../ui/ui-config";
import { SURFACE_RADIUS_CLASS } from "../utils/surface-radius";

type TestStatus = "passed" | "failed" | "skipped" | "running";

interface TestResultsSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;
}

interface TestResultsContextType {
  summary?: TestResultsSummary;
}

const TestResultsContext = createContext<TestResultsContextType>({});

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export type TestResultsProps = HTMLAttributes<HTMLDivElement> & {
  summary?: TestResultsSummary;
};

export const TestResults = ({
  summary,
  className,
  children,
  ...props
}: TestResultsProps) => {
  const merge = useCn();
  const contextValue = useMemo(() => ({ summary }), [summary]);

  return (
    <TestResultsContext.Provider value={contextValue}>
      <div
        className={merge("border bg-background", SURFACE_RADIUS_CLASS, className)}
        {...props}
      >
        {children ??
          (summary && (
            <TestResultsHeader>
              <TestResultsSummary />
              <TestResultsDuration />
            </TestResultsHeader>
          ))}
      </div>
    </TestResultsContext.Provider>
  );
};

export type TestResultsHeaderProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsHeader = ({
  className,
  children,
  ...props
}: TestResultsHeaderProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        "flex items-center justify-between border-b px-4 py-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export type TestResultsSummaryProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsSummary = ({
  className,
  children,
  ...props
}: TestResultsSummaryProps) => {
  const merge = useCn();
  const { summary } = useContext(TestResultsContext);

  if (!summary) return null;

  return (
    <div className={merge("flex items-center gap-3", className)} {...props}>
      {children ?? (
        <>
          <Badge className="gap-1" variant="success">
            <IconCircleCheck className="size-3" />
            {summary.passed} passed
          </Badge>
          {summary.failed > 0 && (
            <Badge className="gap-1" variant="destructive">
              <IconCircleX className="size-3" />
              {summary.failed} failed
            </Badge>
          )}
          {summary.skipped > 0 && (
            <Badge className="gap-1" variant="warning">
              <IconCircle className="size-3" />
              {summary.skipped} skipped
            </Badge>
          )}
        </>
      )}
    </div>
  );
};

export type TestResultsDurationProps = HTMLAttributes<HTMLSpanElement>;

export const TestResultsDuration = ({
  className,
  children,
  ...props
}: TestResultsDurationProps) => {
  const merge = useCn();
  const { summary } = useContext(TestResultsContext);

  if (!summary?.duration) return null;

  return (
    <span className={merge("text-muted-foreground text-sm", className)} {...props}>
      {children ?? formatDuration(summary.duration)}
    </span>
  );
};

export type TestResultsProgressProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsProgress = ({
  className,
  children,
  ...props
}: TestResultsProgressProps) => {
  const merge = useCn();
  const { summary } = useContext(TestResultsContext);

  if (!summary) return null;

  const passedPercent = (summary.passed / summary.total) * 100;
  const failedPercent = (summary.failed / summary.total) * 100;

  return (
    <div className={merge("space-y-2", className)} {...props}>
      {children ?? (
        <>
          {/* Two full-width layers scaled from the left edge rather than two
              flex siblings sized by `width`: the flex version relayouted the
              track on every frame. The failed layer spans passed+failed and sits
              underneath, so the passed layer painted over it leaves the same
              two-tone bar while both segments only ever scale. */}
          <div className="relative h-2 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className="absolute inset-0 origin-left bg-destructive transition-transform duration-[var(--motion-base)]"
              style={{
                transform: `scaleX(${(passedPercent + failedPercent) / 100})`,
              }}
            />
            <div
              className="absolute inset-0 origin-left bg-success transition-transform duration-[var(--motion-base)]"
              style={{ transform: `scaleX(${passedPercent / 100})` }}
            />
          </div>
          <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
            <span>
              {summary.passed}/{summary.total} tests passed
            </span>
            <span>{passedPercent.toFixed(0)}%</span>
          </div>
        </>
      )}
    </div>
  );
};

export type TestResultsContentProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsContent = ({
  className,
  children,
  ...props
}: TestResultsContentProps) => {
  const merge = useCn();
  return (
    <div className={merge("space-y-2 p-4", className)} {...props}>
      {children}
    </div>
  );
};

interface TestSuiteContextType {
  name: string;
  status: TestStatus;
}

const TestSuiteContext = createContext<TestSuiteContextType>({
  name: "",
  status: "passed",
});

export type TestSuiteProps = ComponentProps<typeof Collapsible> & {
  name: string;
  status: TestStatus;
};

export const TestSuite = ({
  name,
  status,
  className,
  children,
  ...props
}: TestSuiteProps) => {
  const merge = useCn();
  const contextValue = useMemo(() => ({ name, status }), [name, status]);

  return (
    <TestSuiteContext.Provider value={contextValue}>
      <Collapsible
        className={merge("border", SURFACE_RADIUS_CLASS, className)}
        {...props}
      >
        {children}
      </Collapsible>
    </TestSuiteContext.Provider>
  );
};

export type TestSuiteNameProps = ComponentProps<typeof CollapsibleTrigger>;

export const TestSuiteName = ({
  className,
  children,
  ...props
}: TestSuiteNameProps) => {
  const merge = useCn();
  const { name, status } = useContext(TestSuiteContext);

  return (
    <CollapsibleTrigger
      className={merge(
        "group flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-secondary/50",
        className,
      )}
      {...props}
    >
      <IconChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      <TestStatusIcon status={status} />
      <span className="font-medium text-sm">{children ?? name}</span>
    </CollapsibleTrigger>
  );
};

export type TestSuiteStatsProps = HTMLAttributes<HTMLDivElement> & {
  passed?: number;
  failed?: number;
  skipped?: number;
};

export const TestSuiteStats = ({
  passed = 0,
  failed = 0,
  skipped = 0,
  className,
  children,
  ...props
}: TestSuiteStatsProps) => {
  const merge = useCn();
  return (
    <div
      className={merge("ml-auto flex items-center gap-2 text-xs", className)}
      {...props}
    >
      {children ?? (
        <>
          {passed > 0 && <span className="text-success">{passed} passed</span>}
          {failed > 0 && (
            <span className="text-destructive">{failed} failed</span>
          )}
          {skipped > 0 && <span className="text-warning">{skipped} skipped</span>}
        </>
      )}
    </div>
  );
};

export type TestSuiteContentProps = ComponentProps<typeof CollapsibleContent>;

export const TestSuiteContent = ({
  className,
  children,
  ...props
}: TestSuiteContentProps) => {
  const merge = useCn();
  return (
    <CollapsibleContent className={merge("border-t", className)} {...props}>
      <div className="divide-y">{children}</div>
    </CollapsibleContent>
  );
};

interface TestContextType {
  name: string;
  status: TestStatus;
  duration?: number;
}

const TestContext = createContext<TestContextType>({
  name: "",
  status: "passed",
});

export type TestResultProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  status: TestStatus;
  duration?: number;
};

export const TestResult = ({
  name,
  status,
  duration,
  className,
  children,
  ...props
}: TestResultProps) => {
  const merge = useCn();
  const contextValue = useMemo(
    () => ({ duration, name, status }),
    [duration, name, status],
  );

  return (
    <TestContext.Provider value={contextValue}>
      <div
        className={merge("flex items-center gap-2 px-4 py-2 text-sm", className)}
        {...props}
      >
        {children ?? (
          <>
            <TestResultStatusIndicator />
            <TestResultName />
            {duration !== undefined && <TestResultDuration />}
          </>
        )}
      </div>
    </TestContext.Provider>
  );
};

const statusStyles: Record<TestStatus, string> = {
  failed: "text-destructive",
  passed: "text-success",
  running: "text-primary",
  skipped: "text-warning",
};

const statusIcons: Record<TestStatus, React.ReactNode> = {
  failed: <IconCircleX className="size-4" />,
  passed: <IconCircleCheck className="size-4" />,
  running: <IconCircleDot className="size-4" />,
  skipped: <IconCircle className="size-4" />,
};

const TestStatusIcon = ({ status }: { status: TestStatus }) => {
  const merge = useCn();
  return (
    <span className={merge("shrink-0", statusStyles[status])}>
      {statusIcons[status]}
    </span>
  );
};

export type TestResultStatusIndicatorProps = HTMLAttributes<HTMLSpanElement>;

export const TestResultStatusIndicator = ({
  className,
  children,
  ...props
}: TestResultStatusIndicatorProps) => {
  const merge = useCn();
  const { status } = useContext(TestContext);

  return (
    <span
      className={merge("shrink-0", statusStyles[status], className)}
      {...props}
    >
      {children ?? statusIcons[status]}
    </span>
  );
};

export type TestResultNameProps = HTMLAttributes<HTMLSpanElement>;

export const TestResultName = ({ className, children, ...props }: TestResultNameProps) => {
  const merge = useCn();
  const { name } = useContext(TestContext);

  return (
    <span className={merge("flex-1", className)} {...props}>
      {children ?? name}
    </span>
  );
};

export type TestResultDurationProps = HTMLAttributes<HTMLSpanElement>;

export const TestResultDuration = ({
  className,
  children,
  ...props
}: TestResultDurationProps) => {
  const merge = useCn();
  const { duration } = useContext(TestContext);

  if (duration === undefined) return null;

  return (
    <span
      className={merge("ml-auto text-muted-foreground text-xs", className)}
      {...props}
    >
      {children ?? `${duration}ms`}
    </span>
  );
};

export type TestResultErrorProps = HTMLAttributes<HTMLDivElement>;

export const TestResultError = ({
  className,
  children,
  ...props
}: TestResultErrorProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        "mt-2 bg-destructive/10 p-3",
        SURFACE_RADIUS_CLASS,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export type TestResultErrorMessageProps = HTMLAttributes<HTMLParagraphElement>;

export const TestResultErrorMessage = ({
  className,
  children,
  ...props
}: TestResultErrorMessageProps) => {
  const merge = useCn();
  return (
    <p
      className={merge("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
};

export type TestResultErrorStackProps = HTMLAttributes<HTMLPreElement>;

export const TestResultErrorStack = ({
  className,
  children,
  ...props
}: TestResultErrorStackProps) => {
  const merge = useCn();
  return (
    <pre
      className={merge(
        "mt-2 overflow-auto font-mono text-xs text-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  );
};
