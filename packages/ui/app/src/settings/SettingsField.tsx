import type { ReactNode } from "react";

interface SettingsFieldProps {
  /** Field name, shown above the control (stacked) or left of it (horizontal). */
  label: ReactNode;
  /** Help text, shown under the control (stacked) or under the label (horizontal). */
  description?: ReactNode;
  /** `id` of the control, so clicking the label focuses it. */
  htmlFor?: string;
  /** `"stacked"` (default) or `"horizontal"`. */
  layout?: "stacked" | "horizontal";
  children: ReactNode;
}

/**
 * One labelled control inside a SettingsSection body.
 *
 * Every settings form repeats the same label / control / help-text stack, so it
 * lives here rather than being re-spaced per field. Stack several inside a
 * section body with `grid gap-5`. Shared across apps.
 *
 * - `layout="stacked"` (default): label above the control, help text below it.
 * - `layout="horizontal"`: one row with the label and help text on the left and
 *   the control on the right, for compact controls such as a select. The label
 *   is a `<label>` when `htmlFor` is set, otherwise a `<p>`.
 */
export function SettingsField({
  label,
  description,
  htmlFor,
  layout = "stacked",
  children,
}: SettingsFieldProps) {
  if (layout === "horizontal") {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {htmlFor ? (
            <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
              {label}
            </label>
          ) : (
            <p className="text-sm font-medium text-foreground">{label}</p>
          )}
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {description ? (
        <p className="mt-1.5 text-pretty text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
