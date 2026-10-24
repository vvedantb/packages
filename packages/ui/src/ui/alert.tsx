import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { SURFACE_RADIUS_CLASS } from "../utils/surface-radius";
import { useCn } from "./ui-config";

const alertVariants = cva(
  `relative w-full border border-border bg-card px-4 py-3 text-sm ${SURFACE_RADIUS_CLASS} [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7`,
  {
    variants: {
      variant: {
        default: "text-foreground",
        destructive:
          "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => {
  const merge = useCn();
  return (
    <div
      ref={ref}
      role="alert"
      className={merge(alertVariants({ variant }), className)}
      {...props}
    />
  );
});
Alert.displayName = "Alert";

const AlertDescription = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const merge = useCn();
  return <div ref={ref} className={merge("text-sm [&_p]:leading-relaxed", className)} {...props} />;
});
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription, alertVariants };
