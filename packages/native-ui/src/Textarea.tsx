import * as React from "react";
import { Input as PrimitiveInput } from "./primitives/input";
import { cn } from "./cn";
import { fieldStyle, fieldTextStyle } from "./controlStyles";
import { tokens } from "./tokens";
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
      placeholderTextColor={placeholderTextColor ?? tokens.color.muted[scheme]}
      className={cn(
        "min-h-28 border px-4 py-3 text-lg font-instrument-sans-medium text-foreground",
        largerText && "min-h-32 text-xl",
        className,
      )}
      style={[fieldStyle(scheme), fieldTextStyle(scheme), style]}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
