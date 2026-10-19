import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../utils/cn";

// `default`: open centred block, large bare icon, one muted line (a page or list body).
// `panel`: filled rounded block with the icon in a tile (a detail panel or modal section).
export type EmptyStateVariant = "default" | "panel";

const EmptyStateContext = React.createContext<EmptyStateVariant>("default");

export type EmptyStateRootProps = React.ComponentProps<"div"> & {
  /** Layout for the other parts. Default `"default"`. */
  variant?: EmptyStateVariant;
};

function Root({ variant = "default", className, ...props }: EmptyStateRootProps) {
  return (
    <EmptyStateContext value={variant}>
      <div
        {...props}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          variant === "panel" ? "rounded-lg bg-surface-secondary px-4 py-10" : "px-4 py-20",
          className,
        )}
      />
    </EmptyStateContext>
  );
}
Root.displayName = "EmptyState.Root";

export type EmptyStateIconProps = {
  /** Icon component, e.g. a Tabler icon. */
  icon: React.ComponentType<{ size?: number | string; stroke?: number | string; className?: string }>;
  /** Pixel size. Default 40 (`default`) or 22 (`panel`). */
  size?: number;
  /** Stroke width. Default the icon's own (`default`) or 1.5 (`panel`). */
  stroke?: number;
  /** Classes for the outer element: the icon (`default`) or its tile (`panel`). */
  className?: string;
};

function Icon({ icon: IconComponent, size, stroke, className }: EmptyStateIconProps) {
  if (React.use(EmptyStateContext) === "panel") {
    return (
      <div
        className={cn(
          "mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-surface-tertiary",
          className,
        )}
      >
        <IconComponent size={size ?? 22} className="text-muted-foreground" stroke={stroke ?? 1.5} />
      </div>
    );
  }
  return (
    <IconComponent
      size={size ?? 40}
      stroke={stroke}
      className={cn("mb-3 text-muted-foreground", className)}
    />
  );
}
Icon.displayName = "EmptyState.Icon";

export type EmptyStateTitleProps = React.ComponentProps<"p"> & {
  /** Render the child element (e.g. an `h3`) with the title classes. */
  asChild?: boolean;
};

function Title({ asChild = false, className, ...props }: EmptyStateTitleProps) {
  const Comp = asChild ? Slot : "p";
  return (
    <Comp
      {...props}
      className={cn(
        "text-sm font-medium text-foreground",
        React.use(EmptyStateContext) === "default" && "mb-1",
        className,
      )}
    />
  );
}
Title.displayName = "EmptyState.Title";

export type EmptyStateDescriptionProps = React.ComponentProps<"p">;

function Description({ className, ...props }: EmptyStateDescriptionProps) {
  return (
    <p
      {...props}
      className={cn(
        React.use(EmptyStateContext) === "panel" && "mt-1 max-w-[240px]",
        "text-sm text-muted-foreground",
        className,
      )}
    />
  );
}
Description.displayName = "EmptyState.Description";

export type EmptyStateActionsProps = React.ComponentProps<"div">;

function Actions({ className, ...props }: EmptyStateActionsProps) {
  return <div {...props} className={cn("mt-4", className)} />;
}
Actions.displayName = "EmptyState.Actions";

/**
 * Composable "nothing here yet" block: `EmptyState.Root` sets the variant, the
 * other parts read it. Render only the parts you need.
 */
export const EmptyState = {
  Root,
  Icon,
  Title,
  Description,
  Actions,
};
