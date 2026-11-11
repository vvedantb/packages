import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Spinner } from "./spinner";
import { useCn, useUiConfig } from "./ui-config";

const ghostClass =
  "text-muted-foreground hover:bg-surface-tertiary hover:text-foreground";

const buttonBaseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-normal transition-[transform,background-color,box-shadow,opacity,border-color] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96] active:duration-[var(--motion-fast,150ms)] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0";

const buttonVariantClasses = {
  default:
    "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:opacity-90",
  destructive:
    "bg-[oklch(47.2%_0.195_25.7)] text-white hover:bg-[oklch(42.5%_0.185_25.7)]",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-default",
  secondary: "bg-default text-default-foreground hover:bg-default/78",
  ghost: ghostClass,
  link: "text-primary underline-offset-4 hover:underline active:scale-100",
  // Ghost plus an override; tailwind-merge drops the clashing ghost classes.
  flat: `${ghostClass} bg-transparent text-muted hover:bg-surface-tertiary hover:text-foreground`, // check-tokens-allow: text-muted
  success: `${ghostClass} bg-success text-success-foreground hover:bg-success/90`,
  warning: `${ghostClass} bg-warning text-warning-foreground hover:bg-warning/90`,
};

// No radius here: `shape` sets it.
const buttonSizeClasses = {
  default: "h-10 px-4 py-2",
  xs: "h-7 px-2 text-xs hit-target [&_svg:not([class*='size-'])]:size-3.5",
  sm: "h-8 px-3 text-xs max-sm:hit-target",
  lg: "h-11 px-6",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8 max-sm:hit-target",
  "icon-xs": "h-7 w-7 hit-target",
};

// `pill` (default) is fully round, so icon sizes are circles. `rounded` is
// the radius from before 0.31.0, for joined edges and field addons.
const buttonShapeClasses = {
  pill: "rounded-full",
  rounded: "rounded-lg",
};

type ButtonVariant = keyof typeof buttonVariantClasses;
type ButtonSize = keyof typeof buttonSizeClasses;
type ButtonShape = keyof typeof buttonShapeClasses;

// `rounded` keeps the smaller radius the two 28px sizes had.
const roundedSmallSizes: ButtonSize[] = ["xs", "icon-xs"];
const roundedSmallClass = "rounded-md";

const buttonVariants = cva(buttonBaseClasses, {
  variants: {
    variant: buttonVariantClasses,
    size: buttonSizeClasses,
    shape: buttonShapeClasses,
  },
  compoundVariants: [{ shape: "rounded", size: roundedSmallSizes, class: roundedSmallClass }],
  defaultVariants: {
    variant: "default",
    size: "default",
    shape: "pill",
  },
});

/** Built-in radius for the config path. Matches the cva variant and compound variant. */
function buttonShapeClass(shape: ButtonShape, size: ButtonSize): string {
  return shape === "rounded" && roundedSmallSizes.includes(size)
    ? roundedSmallClass
    : buttonShapeClasses[shape];
}

/** `UiConfig.Button`: each given class string replaces the built-in one. */
export interface ButtonConfig {
  classes?: {
    base?: string;
    variant?: Partial<Record<ButtonVariant, string>>;
    size?: Partial<Record<ButtonSize, string>>;
    /** Radius per shape. Replaces it for every size, `xs` and `icon-xs` included. */
    shape?: Partial<Record<ButtonShape, string>>;
  };
}

/** `shape`: `"pill"` (default, `rounded-full`) or `"rounded"` (the radius from before 0.31.0). */
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Rendered before the children. Ignored with `asChild`. */
  startContent?: React.ReactNode;
  /** Rendered after the children. Ignored with `asChild`. */
  endContent?: React.ReactNode;
  /** Disables the button, sets `data-loading`, and shows a spinner in place of `startContent`. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, shape, asChild = false, startContent, endContent, loading, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const classes = useUiConfig("Button")?.classes;
    const merge = useCn();
    const v = variant ?? "default";
    const s = size ?? "default";
    const sh = shape ?? "pill";
    return (
      <Comp
        className={
          classes
            ? merge(
                classes.base ?? buttonBaseClasses,
                classes.variant?.[v] ?? buttonVariantClasses[v],
                classes.size?.[s] ?? buttonSizeClasses[s],
                classes.shape?.[sh] ?? buttonShapeClass(sh, s),
                className,
              )
            : merge(buttonVariants({ variant, size, shape, className }))
        }
        ref={ref}
        {...props}
        {...(loading ? { disabled: true, "data-loading": "true" } : null)}
      >
        {asChild ? children : (
          <>
            {loading ? <Spinner variant="ring" /> : startContent}
            {children}
            {endContent}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button };
