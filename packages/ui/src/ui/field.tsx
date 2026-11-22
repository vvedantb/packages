import * as React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { useCn } from "./ui-config";

interface FieldContextValue {
  controlId: string;
  descriptionId: string;
  errorId: string;
  hasDescription: boolean;
  hasError: boolean;
  setHasDescription: (present: boolean) => void;
  setHasError: (present: boolean) => void;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField(part: string): FieldContextValue {
  const value = React.useContext(FieldContext);
  if (!value) throw new Error(`${part} must be used inside <Field>.`);
  return value;
}

export interface FieldProps extends React.ComponentPropsWithoutRef<"div"> {
  /** The `id` of the control, which `FieldLabel` points at with `htmlFor`. Default: a generated id. */
  controlId?: string;
}

/**
 * Stack for one labelled control. It generates the control `id` and the ids of
 * the description and error, so `FieldLabel` (`htmlFor`) and `FieldControl`
 * (`id`, `aria-describedby`) link up without any manual wiring.
 *
 * A plain `<Input />` does not need it. Use it when a field has a label, a
 * hint or an error message.
 */
const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, controlId, ...props }, ref) => {
    const merge = useCn();
    const generated = React.useId();
    const [hasDescription, setHasDescription] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const id = controlId ?? generated;
    const context = React.useMemo<FieldContextValue>(
      () => ({
        controlId: id,
        descriptionId: `${id}-description`,
        errorId: `${id}-error`,
        hasDescription,
        hasError,
        setHasDescription,
        setHasError,
      }),
      [id, hasDescription, hasError],
    );
    return (
      <FieldContext.Provider value={context}>
        <div ref={ref} className={merge("grid gap-2", className)} {...props} />
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";

/** `Label` with `htmlFor` set to the control id of the nearest `Field`. */
const FieldLabel = React.forwardRef<
  React.ComponentRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>((props, ref) => {
  const { controlId } = useField("FieldLabel");
  return <Label ref={ref} htmlFor={controlId} {...props} />;
});
FieldLabel.displayName = "FieldLabel";

/**
 * `Input` with the `id` of the nearest `Field`. `aria-describedby` lists the
 * description and error ids that are rendered, and nothing when there are none.
 * `aria-invalid` is set while a `FieldError` is rendered. Both merge with props
 * you pass.
 */
const FieldControl = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ "aria-describedby": describedBy, "aria-invalid": invalid, ...props }, ref) => {
    const field = useField("FieldControl");
    const ids = [
      describedBy,
      field.hasDescription ? field.descriptionId : undefined,
      field.hasError ? field.errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <Input
        {...props}
        ref={ref}
        id={field.controlId}
        aria-describedby={ids || undefined}
        aria-invalid={invalid ?? (field.hasError ? true : undefined)}
      />
    );
  },
);
FieldControl.displayName = "FieldControl";

function useRegister(set: (present: boolean) => void) {
  React.useLayoutEffect(() => {
    set(true);
    return () => set(false);
  }, [set]);
}

/** Muted hint under the control. Its id joins the control's `aria-describedby`. */
const FieldDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<"p">>(
  ({ className, ...props }, ref) => {
    const field = useField("FieldDescription");
    const merge = useCn();
    useRegister(field.setHasDescription);
    return (
      <p
        ref={ref}
        id={field.descriptionId}
        className={merge("text-sm text-muted-foreground", className)}
        {...props}
      />
    );
  },
);
FieldDescription.displayName = "FieldDescription";

/** Error message under the control. Its id joins the control's `aria-describedby`, and the control becomes `aria-invalid`. */
const FieldError = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<"p">>(
  ({ className, ...props }, ref) => {
    const field = useField("FieldError");
    const merge = useCn();
    useRegister(field.setHasError);
    return (
      <p
        ref={ref}
        id={field.errorId}
        role="alert"
        className={merge("text-sm text-danger", className)}
        {...props}
      />
    );
  },
);
FieldError.displayName = "FieldError";

export { Field, FieldControl, FieldDescription, FieldError, FieldLabel };
