import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useCn, useUiConfig } from "./ui-config";

const ghostClass =
  "text-muted-foreground hover:bg-surface-tertiary hover:text-foreground";

const buttonBaseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-normal transition-[transform,background-color,box-shadow,opacity,border-color] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0";

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

const buttonSizeClasses = {
  default: "h-10 px-4 py-2",
  xs: "h-7 rounded-md px-2 text-xs hit-target [&_svg:not([class*='size-'])]:size-3.5",
  sm: "h-8 rounded-lg px-3 text-xs max-sm:hit-target",
  lg: "h-11 px-6",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8 rounded-lg max-sm:hit-target",
  "icon-xs": "h-7 w-7 rounded-md hit-target",
};

const buttonVariants = cva(buttonBaseClasses, {
  variants: {
    variant: buttonVariantClasses,
    size: buttonSizeClasses,
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type ButtonVariant = keyof typeof buttonVariantClasses;
type ButtonSize = keyof typeof buttonSizeClasses;

/** `UiConfig.Button`: each given class string replaces the built-in one. */
export interface ButtonConfig {
  classes?: {
    base?: string;
    variant?: Partial<Record<ButtonVariant, string>>;
    size?: Partial<Record<ButtonSize, string>>;
  };
}

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

function ButtonSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, startContent, endContent, loading, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const classes = useUiConfig("Button")?.classes;
    const merge = useCn();
    const v = variant ?? "default";
    const s = size ?? "default";
    return (
      <Comp
        className={
          classes
            ? merge(
                classes.base ?? buttonBaseClasses,
                classes.variant?.[v] ?? buttonVariantClasses[v],
                classes.size?.[s] ?? buttonSizeClasses[s],
                className,
              )
            : merge(buttonVariants({ variant, size, className }))
        }
        ref={ref}
        {...props}
        {...(loading ? { disabled: true, "data-loading": "true" } : null)}
      >
        {asChild ? children : (
          <>
            {loading ? <ButtonSpinner /> : startContent}
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
