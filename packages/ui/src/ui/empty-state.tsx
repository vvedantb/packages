import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { m, type Variants } from "motion/react";
import { motionEase } from "../motion/presets";
import { useUiConfig } from "./ui-config";
import { cn } from "../utils/cn";

// `default`: open centred block, large bare icon, one muted line (a page or list body).
// `panel`: filled rounded block with the icon in a tile (a detail panel or modal section).
export type EmptyStateVariant = "default" | "panel";

/**
 * App-wide look for `EmptyState`. `classes` merge after each part's built-in
 * classes. `classes.iconWrap` puts the `default` icon in a wrapper (a circle,
 * say) and drops the icon's own margin. `enter` turns on the staggered
 * entrance for every Root that does not set `enter` itself.
 */
export interface EmptyStateConfig {
  classes?: {
    root?: string;
    iconWrap?: string;
    icon?: string;
    title?: string;
    description?: string;
    actions?: string;
  };
  enter?: boolean;
}

const EmptyStateContext = React.createContext<{ variant: EmptyStateVariant; enter: boolean }>({
  variant: "default",
  enter: false,
});

const CONTAINER_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: motionEase } },
};

export type EmptyStateRootProps = React.ComponentProps<"div"> & {
  /** Layout for the other parts. Default `"default"`. */
  variant?: EmptyStateVariant;
  /**
   * Parts rise and fade in one after another. Default `UiConfig.EmptyState.enter`,
   * else `false`. Pass `false` for an empty state that flashes often (a filter
   * with no results). Uses `m`, so it needs `LazyMotion`.
   */
  enter?: boolean;
};

function Root({ variant = "default", enter: enterProp, className, ...props }: EmptyStateRootProps) {
  const config = useUiConfig("EmptyState");
  const enter = enterProp ?? config?.enter ?? false;
  const classes = cn(
    "flex flex-col items-center justify-center text-center",
    variant === "panel" ? "rounded-lg bg-surface-secondary px-4 py-10" : "px-4 py-20",
    config?.classes?.root,
    className,
  );
  return (
    <EmptyStateContext value={{ variant, enter }}>
      {enter ? (
        <m.div
          {...stripMotionConflicts(props)}
          className={classes}
          variants={CONTAINER_VARIANTS}
          initial="hidden"
          animate="show"
        />
      ) : (
        <div {...props} className={classes} />
      )}
    </EmptyStateContext>
  );
}
Root.displayName = "EmptyState.Root";

// The DOM drag and animation handlers clash with Motion's own prop types.
function stripMotionConflicts(props: React.ComponentProps<"div">) {
  const {
    onDrag: _onDrag,
    onDragStart: _onDragStart,
    onDragEnd: _onDragEnd,
    onAnimationStart: _onAnimationStart,
    ...rest
  } = props;
  return rest;
}

/** A part's own element: `m.*` with the item variants while the Root enters. */
function useItemMotion() {
  return React.use(EmptyStateContext).enter ? { variants: ITEM_VARIANTS } : null;
}

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
  const { variant } = React.use(EmptyStateContext);
  const config = useUiConfig("EmptyState");
  const itemMotion = useItemMotion();
  if (variant === "panel") {
    const tileClass = cn(
      "mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-surface-tertiary",
      className,
    );
    const glyph = <IconComponent size={size ?? 22} className="text-muted-foreground" stroke={stroke ?? 1.5} />;
    return itemMotion ? (
      <m.div {...itemMotion} className={tileClass}>
        {glyph}
      </m.div>
    ) : (
      <div className={tileClass}>{glyph}</div>
    );
  }
  const wrapClass = config?.classes?.iconWrap;
  if (wrapClass !== undefined) {
    const glyph = <IconComponent size={size ?? 40} stroke={stroke} className={config?.classes?.icon} />;
    const outer = cn(wrapClass, className);
    return itemMotion ? (
      <m.div {...itemMotion} className={outer}>
        {glyph}
      </m.div>
    ) : (
      <div className={outer}>{glyph}</div>
    );
  }
  const glyph = (
    <IconComponent
      size={size ?? 40}
      stroke={stroke}
      className={cn("mb-3 text-muted-foreground", config?.classes?.icon, className)}
    />
  );
  return itemMotion ? <m.div {...itemMotion}>{glyph}</m.div> : glyph;
}
Icon.displayName = "EmptyState.Icon";

export type EmptyStateTitleProps = React.ComponentProps<"p"> & {
  /** Render the child element (e.g. an `h3`) with the title classes. */
  asChild?: boolean;
};

function Title({ asChild = false, className, ...props }: EmptyStateTitleProps) {
  const { variant } = React.use(EmptyStateContext);
  const config = useUiConfig("EmptyState");
  const itemMotion = useItemMotion();
  const classes = cn(
    "text-sm font-medium text-foreground",
    variant === "default" && "mb-1",
    config?.classes?.title,
    className,
  );
  if (asChild) return <Slot {...props} className={classes} />;
  if (itemMotion) return <m.p {...stripPConflicts(props)} {...itemMotion} className={classes} />;
  return <p {...props} className={classes} />;
}
Title.displayName = "EmptyState.Title";

function stripPConflicts(props: React.ComponentProps<"p">) {
  const {
    onDrag: _onDrag,
    onDragStart: _onDragStart,
    onDragEnd: _onDragEnd,
    onAnimationStart: _onAnimationStart,
    ...rest
  } = props;
  return rest;
}

export type EmptyStateDescriptionProps = React.ComponentProps<"p">;

function Description({ className, ...props }: EmptyStateDescriptionProps) {
  const { variant } = React.use(EmptyStateContext);
  const config = useUiConfig("EmptyState");
  const itemMotion = useItemMotion();
  const classes = cn(
    variant === "panel" && "mt-1 max-w-[240px]",
    "text-sm text-muted-foreground",
    config?.classes?.description,
    className,
  );
  if (itemMotion) return <m.p {...stripPConflicts(props)} {...itemMotion} className={classes} />;
  return <p {...props} className={classes} />;
}
Description.displayName = "EmptyState.Description";

export type EmptyStateActionsProps = React.ComponentProps<"div">;

function Actions({ className, ...props }: EmptyStateActionsProps) {
  const config = useUiConfig("EmptyState");
  const itemMotion = useItemMotion();
  const classes = cn("mt-4", config?.classes?.actions, className);
  if (itemMotion) return <m.div {...stripMotionConflicts(props)} {...itemMotion} className={classes} />;
  return <div {...props} className={classes} />;
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
