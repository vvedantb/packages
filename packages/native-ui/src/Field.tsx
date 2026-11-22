import * as React from "react";
import { Text, View, type TextProps, type ViewProps } from "react-native";
import { cn } from "./cn";
import { Input, type InputProps } from "./Input";
import { Label, type LabelProps } from "./Label";
import { sizeStyle, textStyle, typeStyle } from "./controlStyles";
import { palette } from "./palette";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

interface FieldContextValue {
  labelId: string;
  hasLabel: boolean;
  setHasLabel: (present: boolean) => void;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField(part: string): FieldContextValue {
  const value = React.useContext(FieldContext);
  if (!value) throw new Error(`${part} must be used inside <Field>.`);
  return value;
}

type FieldProps = ViewProps & {
  className?: string;
  /** The `nativeID` of the label. Default: a generated id. */
  labelId?: string;
};

/**
 * A labelled control: a `gap-2` column. It generates the `nativeID` that
 * `FieldLabel` sets and `FieldControl` points at with `accessibilityLabelledBy`.
 * A plain `Input` does not need it.
 */
function Field({ className, labelId, ...props }: FieldProps) {
  const generated = React.useId();
  const [hasLabel, setHasLabel] = React.useState(false);
  const id = labelId ?? `field-${generated}-label`;
  const context = React.useMemo(() => ({ labelId: id, hasLabel, setHasLabel }), [id, hasLabel]);
  return (
    <FieldContext.Provider value={context}>
      <View className={cn("gap-2", className)} {...props} />
    </FieldContext.Provider>
  );
}

/** `Label` with the `nativeID` of the nearest `Field`. */
function FieldLabel(props: LabelProps) {
  const field = useField("FieldLabel");
  const { setHasLabel } = field;
  React.useLayoutEffect(() => {
    setHasLabel(true);
    return () => setHasLabel(false);
  }, [setHasLabel]);
  return <Label nativeID={field.labelId} {...props} />;
}

/**
 * `Input` that names itself from the `FieldLabel` of the nearest `Field`
 * (`accessibilityLabelledBy`, Android). With no `FieldLabel` rendered it
 * keeps the `accessibilityLabel` you pass, which is the fallback on iOS too.
 */
function FieldControl(props: InputProps) {
  const field = useField("FieldControl");
  return (
    <Input
      {...props}
      {...(field.hasLabel ? { accessibilityLabelledBy: field.labelId } : null)}
    />
  );
}

/** Muted hint under the control. */
function FieldDescription({ className, style, ...props }: TextProps & { className?: string }) {
  useField("FieldDescription");
  const scheme = useScheme();
  const size = useLargerText() ? "text-base" : "text-sm";
  return (
    <Text
      className={cn("font-instrument-sans", size, className)}
      style={[textStyle("muted", scheme), sizeStyle(size), style]}
      {...props}
    />
  );
}

/** Error message under the control, read out when it appears. */
function FieldError({ className, style, ...props }: TextProps & { className?: string }) {
  useField("FieldError");
  const scheme = useScheme();
  const size = useLargerText() ? "text-base" : "text-sm";
  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className={cn("font-instrument-sans-medium", size, className)}
      style={[{ color: palette.danger[scheme] }, sizeStyle(size), typeStyle("medium"), style]}
      {...props}
    />
  );
}

export { Field, FieldControl, FieldDescription, FieldError, FieldLabel };
export type { FieldProps };
