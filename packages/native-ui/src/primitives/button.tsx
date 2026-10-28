import { TextClassContext } from "./text";
import { cn } from "../cn";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Pressable } from "react-native";

const buttonVariants = cva(
  cn(
    "group flex-row items-center justify-center gap-2 rounded-lg shadow-none active:opacity-80",
    Platform.select({
      web: "outline-none transition-all",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary",
          Platform.select({ web: "hover:bg-primary/90" }),
        ),
        destructive: cn(
          "bg-destructive",
          Platform.select({ web: "hover:bg-destructive/90" }),
        ),
        outline: cn(
          "border border-border bg-background",
          Platform.select({ web: "hover:bg-accent" }),
        ),
        secondary: cn(
          "bg-secondary",
          Platform.select({ web: "hover:bg-secondary/80" }),
        ),
        ghost: cn(Platform.select({ web: "hover:bg-accent" })),
        link: "",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// No weight: a class context cannot carry the `typeStyle` that a face class
// needs, so `Button` sets the medium face and its weight on its label.
const buttonTextVariants = cva("text-sm text-foreground", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-white",
      outline: "text-accent-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-accent-foreground",
      link: "text-primary underline",
    },
    size: {
      default: "",
      sm: "",
      lg: "",
      icon: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(({ className, variant, size, ...props }, ref) => {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          props.disabled && "opacity-45",
          className,
        )}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
});

Button.displayName = "Button";

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
