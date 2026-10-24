"use client";

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { isValidElement } from "react";
import { IconX } from "@tabler/icons-react";

import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCn, useUiConfig } from "../ui/ui-config";
import { flatElevatedSurfaceClass } from "../ui/surface-classes";

/**
 * `UiConfig.Artifact`: classes replace each part's built-in classes
 * (`action` covers `ArtifactAction` and `ArtifactClose`). `actionSize` is the
 * actions' default button size; `actionLabel: "sr-only"` names an action with
 * a visually hidden span instead of `aria-label`.
 */
export interface ArtifactConfig {
  actionSize?: ComponentProps<typeof Button>["size"];
  actionLabel?: "aria-label" | "sr-only";
  classes?: {
    root?: string;
    header?: string;
    title?: string;
    description?: string;
    actions?: string;
    action?: string;
    /** Class of an icon given as a component (`icon={IconCopy}`). */
    actionIcon?: string;
    content?: string;
  };
}

export type ArtifactProps = ComponentProps<"div">;

export const Artifact = ({ className, ...props }: ArtifactProps) => {
  const root = useUiConfig("Artifact")?.classes?.root;
  const merge = useCn();
  return (
    <div
      className={merge(root ?? [flatElevatedSurfaceClass, "rounded-lg"], className)}
      {...props}
    />
  );
};

export type ArtifactHeaderProps = ComponentProps<"div">;

export const ArtifactHeader = ({
  className,
  ...props
}: ArtifactHeaderProps) => {
  const header = useUiConfig("Artifact")?.classes?.header;
  const merge = useCn();
  return (
    <div
      className={merge(
        header ?? "flex items-start justify-between gap-2 px-4 py-3",
        className,
      )}
      {...props}
    />
  );
};

export type ArtifactTitleProps = ComponentProps<"p">;

export const ArtifactTitle = ({ className, ...props }: ArtifactTitleProps) => {
  const title = useUiConfig("Artifact")?.classes?.title;
  const merge = useCn();
  return (
    <p
      className={merge(title ?? "text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
};

export type ArtifactDescriptionProps = ComponentProps<"p">;

export const ArtifactDescription = ({
  className,
  ...props
}: ArtifactDescriptionProps) => {
  const description = useUiConfig("Artifact")?.classes?.description;
  const merge = useCn();
  return (
    <p
      className={merge(description ?? "text-xs text-muted-foreground", className)}
      {...props}
    />
  );
};

export type ArtifactActionsProps = ComponentProps<"div">;

export const ArtifactActions = ({
  className,
  ...props
}: ArtifactActionsProps) => {
  const actions = useUiConfig("Artifact")?.classes?.actions;
  const merge = useCn();
  return (
    <div className={merge(actions ?? "flex items-center gap-1", className)} {...props} />
  );
};

type ArtifactIcon = ComponentType<{ className?: string }>;

/** A component (`IconCopy`) rather than a rendered node (`<IconCopy />`). */
function isIconComponent(icon: ReactNode | ArtifactIcon): icon is ArtifactIcon {
  if (typeof icon === "function") return true;
  // forwardRef / memo components are objects with `render` / `type`.
  return (
    typeof icon === "object" &&
    icon !== null &&
    !isValidElement(icon) &&
    ("render" in icon || "type" in icon)
  );
}

const renderIcon = (Icon: ArtifactIcon, className: string) => <Icon className={className} />;

/** Button shared by `ArtifactAction` and `ArtifactClose`. */
function ArtifactActionButton({
  label,
  className,
  variant = "ghost",
  size,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "aria-label"> & { label?: string }) {
  const config = useUiConfig("Artifact");
  const merge = useCn();
  const srOnly = config?.actionLabel === "sr-only";
  return (
    <Button
      variant={variant}
      size={size ?? config?.actionSize ?? "icon"}
      className={merge(config?.classes?.action ?? "min-w-6 h-6", className)}
      {...(srOnly ? { type: "button" } : { "aria-label": label })}
      {...props}
    >
      {children}
      {srOnly ? <span className="sr-only">{label}</span> : null}
    </Button>
  );
}

export type ArtifactActionProps = ComponentProps<typeof Button> & {
  /** Without it the button renders alone, with no tooltip. */
  tooltip?: string;
  /** A node (`<IconCopy />`) or an icon component (`IconCopy`). */
  icon?: ReactNode | ArtifactIcon;
  label?: string;
};

export const ArtifactAction = ({
  tooltip,
  icon,
  label,
  children,
  "aria-label": ariaLabel,
  ...props
}: ArtifactActionProps) => {
  const actionIcon = useUiConfig("Artifact")?.classes?.actionIcon;
  const content = isIconComponent(icon)
    ? renderIcon(icon, actionIcon ?? "size-4")
    : (icon ?? children);
  const button = (
    <ArtifactActionButton label={ariaLabel ?? label ?? tooltip} {...props}>
      {content}
    </ArtifactActionButton>
  );
  if (!tooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

export type ArtifactCloseProps = ComponentProps<typeof Button> & {
  /** Accessible name. Default `"Close"`. */
  label?: string;
};

/** Close button for the artifact header, an `ArtifactAction` with an X. */
export const ArtifactClose = ({
  label = "Close",
  children,
  ...props
}: ArtifactCloseProps) => (
  <ArtifactActionButton label={label} {...props}>
    {children ?? <IconX className="size-4" />}
  </ArtifactActionButton>
);

export type ArtifactContentProps = ComponentProps<"div">;

export const ArtifactContent = ({
  className,
  ...props
}: ArtifactContentProps) => {
  const content = useUiConfig("Artifact")?.classes?.content;
  const merge = useCn();
  return <div className={merge(content ?? "px-4 pb-4", className)} {...props} />;
};
