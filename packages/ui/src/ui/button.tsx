import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-normal transition-[transform,background-color,box-shadow,opacity,border-color] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:opacity-90",
        destructive:
          "bg-[oklch(47.2%_0.195_25.7)] text-white hover:bg-[oklch(42.5%_0.185_25.7)]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-default",
        secondary: "bg-default text-default-foreground hover:bg-default/78",
        ghost: "text-muted-foreground hover:bg-surface-tertiary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs max-sm:hit-target",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg max-sm:hit-target",
        "icon-xs": "h-7 w-7 rounded-md hit-target",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Rendered before the children. Ignored with `asChild`. */
  startContent?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, startContent, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {asChild ? children : (
          <>
            {startContent}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button };
