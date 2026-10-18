"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../utils/cn";
import { flatElevatedSurfaceClass } from "../ui/surface-classes";

export type ArtifactProps = ComponentProps<"div">;

export const Artifact = ({ className, ...props }: ArtifactProps) => (
  <div
    className={cn(flatElevatedSurfaceClass, "rounded-lg", className)}
    {...props}
  />
);

export type ArtifactHeaderProps = ComponentProps<"div">;

export const ArtifactHeader = ({
  className,
  ...props
}: ArtifactHeaderProps) => (
  <div
    className={cn(
      "flex items-start justify-between gap-2 px-4 py-3",
      className,
    )}
    {...props}
  />
);

export type ArtifactTitleProps = ComponentProps<"p">;

export const ArtifactTitle = ({ className, ...props }: ArtifactTitleProps) => (
  <p
    className={cn("text-sm font-medium text-foreground", className)}
    {...props}
  />
);

export type ArtifactDescriptionProps = ComponentProps<"p">;

export const ArtifactDescription = ({
  className,
  ...props
}: ArtifactDescriptionProps) => (
  <p className={cn("text-xs text-muted-foreground", className)} {...props} />
);

export type ArtifactActionsProps = ComponentProps<"div">;

export const ArtifactActions = ({
  className,
  ...props
}: ArtifactActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

export type ArtifactActionProps = ComponentProps<typeof Button> & {
  tooltip: string;
  icon: ReactNode;
  label?: string;
};

export const ArtifactAction = ({
  tooltip,
  icon,
  label,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: ArtifactActionProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={variant}
        size={size}
        className={cn("min-w-6 h-6", className)}
        aria-label={label ?? tooltip}
        {...props}
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
);

export type ArtifactContentProps = ComponentProps<"div">;

export const ArtifactContent = ({
  className,
  ...props
}: ArtifactContentProps) => (
  <div className={cn("px-4 pb-4", className)} {...props} />
);
