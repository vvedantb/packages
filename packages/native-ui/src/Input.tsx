import * as React from "react";
import { Input as PrimitiveInput } from "./primitives/input";
import { cn } from "./cn";
import { fieldStyle, fieldTextStyle, typeStyle } from "./controlStyles";
import { palette } from "./palette";
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
      placeholderTextColor={placeholderTextColor ?? palette.fieldPlaceholder[scheme]}
      className={cn(
        // The web field px-3.5 py-2 with 16 px type (its phone size), 44 high (the web h-10 is a desktop 40).
        "min-h-11 border px-3.5 py-2 text-base font-instrument-sans",
        largerText && "min-h-16 px-4 py-4 text-xl font-instrument-sans-medium",
        className,
      )}
      style={[
        fieldStyle(scheme),
        fieldTextStyle(scheme),
        largerText ? typeStyle("medium") : null,
        style,
      ]}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
export type { InputProps };
