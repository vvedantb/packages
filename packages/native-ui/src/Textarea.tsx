import * as React from "react";
import { Input as PrimitiveInput } from "./primitives/input";
import { cn } from "./cn";
import { fieldStyle, fieldTextStyle, typeStyle } from "./controlStyles";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

type TextareaProps = React.ComponentPropsWithoutRef<typeof PrimitiveInput> & {
  className?: string;
};

/** Multiline `Input`: same fill, border, radius and type. Grows from 4 lines. */
const Textarea = React.forwardRef<
  React.ElementRef<typeof PrimitiveInput>,
  TextareaProps
>(({ className, placeholderTextColor, numberOfLines = 4, style, ...props }, ref) => {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <PrimitiveInput
      ref={ref}
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      placeholderTextColor={placeholderTextColor ?? palette.fieldPlaceholder[scheme]}
      className={cn(
        // The web textarea: min-h-20 px-3.5 py-2.5, 16 px type.
        "min-h-20 border px-3.5 py-2.5 text-base font-instrument-sans",
        largerText && "min-h-32 px-4 py-3 text-xl font-instrument-sans-medium",
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

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
