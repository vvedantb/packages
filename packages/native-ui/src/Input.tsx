import * as React from "react";
import { Input as PrimitiveInput } from "./primitives/input";
import { cn } from "./cn";
import { fieldStyle, fieldTextStyle } from "./controlStyles";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

type InputProps = React.ComponentPropsWithoutRef<typeof PrimitiveInput> & {
  className?: string;
};

const Input = React.forwardRef<
  React.ElementRef<typeof PrimitiveInput>,
  InputProps
>(({ className, placeholderTextColor, style, ...props }, ref) => {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <PrimitiveInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? tokens.color.muted[scheme]}
      className={cn(
        "min-h-14 border px-4 py-3 text-lg font-instrument-sans-medium text-foreground",
        largerText && "min-h-16 py-4 text-xl",
        className,
      )}
      style={[fieldStyle(scheme), fieldTextStyle(scheme), style]}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
export type { InputProps };
