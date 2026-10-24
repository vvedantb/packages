"use client";

import type { ComponentProps, HTMLAttributes } from "react";
import { createContext, useContext } from "react";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useCn } from "../ui/ui-config";
import { SURFACE_RADIUS_CLASS } from "../utils/surface-radius";

export type SandboxState = "pending" | "running" | "completed" | "error";

interface SandboxContextValue {
  state: SandboxState;
}

const SandboxContext = createContext<SandboxContextValue | null>(null);

const stateBadge: Record<
  SandboxState,
  {
    label: string;
    variant: "warning" | "default" | "success" | "destructive";
  }
> = {
  pending: { label: "Pending", variant: "warning" },
  running: { label: "Running", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  error: { label: "Error", variant: "destructive" },
};

export type SandboxProps = HTMLAttributes<HTMLDivElement> & {
  state: SandboxState;
};

/** A tool run in a sandbox: tabs (code, output) and a state badge. */
export const Sandbox = ({
  state,
  className,
  children,
  ...props
}: SandboxProps) => {
  const merge = useCn();
  return (
    <SandboxContext.Provider value={{ state }}>
      <div
        className={merge("border bg-background", SURFACE_RADIUS_CLASS, className)}
        {...props}
      >
        {children}
      </div>
    </SandboxContext.Provider>
  );
};

export type SandboxContentProps = HTMLAttributes<HTMLDivElement>;

export const SandboxContent = (props: SandboxContentProps) => (
  <div {...props} />
);

export type SandboxTabsProps = ComponentProps<typeof Tabs>;

export const SandboxTabs = (props: SandboxTabsProps) => <Tabs {...props} />;

export type SandboxTabsListProps = ComponentProps<typeof TabsList>;

export const SandboxTabsList = ({
  children,
  className,
  ...props
}: SandboxTabsListProps) => {
  const context = useContext(SandboxContext);
  const merge = useCn();
  const badge = context ? stateBadge[context.state] : null;

  return (
    <div className="flex items-center border-b">
      <TabsList
        className={merge(
          "h-auto flex-1 justify-start rounded-none bg-transparent p-0",
          className,
        )}
        {...props}
      >
        {children}
      </TabsList>
      {badge && (
        <Badge className="mr-3" variant={badge.variant}>
          {badge.label}
        </Badge>
      )}
    </div>
  );
};

export type SandboxTabsTriggerProps = ComponentProps<typeof TabsTrigger>;

export const SandboxTabsTrigger = ({
  className,
  ...props
}: SandboxTabsTriggerProps) => {
  const merge = useCn();
  return (
    <TabsTrigger
      className={merge(
        "rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
        className,
      )}
      {...props}
    />
  );
};

export type SandboxTabContentProps = ComponentProps<typeof TabsContent>;

export const SandboxTabContent = ({
  className,
  ...props
}: SandboxTabContentProps) => {
  const merge = useCn();
  return <TabsContent className={merge("mt-0 p-3", className)} {...props} />;
};
