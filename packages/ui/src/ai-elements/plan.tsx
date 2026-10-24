"use client";

import type { ComponentProps } from "react";

import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { useCn } from "../ui/ui-config";
import { IconSelector } from "@tabler/icons-react";
import { createContext, useContext } from "react";

import { Shimmer } from "./shimmer";

interface PlanContextValue {
  isStreaming: boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("AgentPlan components must be used within AgentPlan");
  }
  return context;
};

export type AgentPlanProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
};

export const AgentPlan = ({
  className,
  isStreaming = false,
  children,
  ...props
}: AgentPlanProps) => {
  const merge = useCn();
  return (
    <PlanContext.Provider value={{ isStreaming }}>
      <Collapsible asChild data-slot="plan" {...props}>
        <Card className={merge("smooth-shadow-none", className)}>{children}</Card>
      </Collapsible>
    </PlanContext.Provider>
  );
};

export type AgentPlanHeaderProps = ComponentProps<typeof CardHeader>;

export const AgentPlanHeader = ({ className, ...props }: AgentPlanHeaderProps) => {
  const merge = useCn();
  return (
    <CardHeader
      className={merge(
        "flex flex-row items-center justify-between gap-2",
        className,
      )}
      data-slot="plan-header"
      {...props}
    />
  );
};

export type AgentPlanTitleProps = Omit<
  ComponentProps<typeof CardTitle>,
  "children"
> & {
  children: string;
};

export const AgentPlanTitle = ({ children, ...props }: AgentPlanTitleProps) => {
  const { isStreaming } = usePlan();

  return (
    <CardTitle data-slot="plan-title" {...props}>
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardTitle>
  );
};

export type AgentPlanActionProps = ComponentProps<typeof CardAction>;

export const AgentPlanAction = (props: AgentPlanActionProps) => (
  <CardAction data-slot="plan-action" {...props} />
);

export type AgentPlanContentProps = ComponentProps<typeof CardContent>;

export const AgentPlanContent = (props: AgentPlanContentProps) => (
  <CollapsibleContent asChild>
    <CardContent data-slot="plan-content" {...props} />
  </CollapsibleContent>
);

export type AgentPlanFooterProps = ComponentProps<"div">;

export const AgentPlanFooter = (props: AgentPlanFooterProps) => (
  <CardFooter data-slot="plan-footer" {...props} />
);

export type AgentPlanTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const AgentPlanTrigger = ({ className, ...props }: AgentPlanTriggerProps) => {
  const merge = useCn();
  return (
    <CollapsibleTrigger asChild>
      <Button
        className={merge("size-8", className)}
        data-slot="plan-trigger"
        size="icon"
        variant="ghost"
        {...props}
      >
        <IconSelector className="size-4" />
        <span className="sr-only">Toggle plan</span>
      </Button>
    </CollapsibleTrigger>
  );
};
