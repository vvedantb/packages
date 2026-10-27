import * as React from "react";
import { Input as PrimitiveInput } from "./primitives/input";
import { cn } from "./cn";
import { FLOATING_ROW_RADIUS } from "./floating";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

type TextareaProps = React.ComponentPropsWithoutRef<typeof PrimitiveInput> & {
  className?: string;
};

/** Multiline `Input`: same fill, border and type, field radius (20) instead of a pill. Grows from 4 lines. */
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
        "min-h-28 border border-white/40 bg-secondary px-4 py-3 text-lg font-instrument-sans-medium text-foreground dark:border-white/10",
        largerText && "min-h-32 text-xl",
        className,
      )}
      style={[{ borderRadius: FLOATING_ROW_RADIUS }, style]}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
