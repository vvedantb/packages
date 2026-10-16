import type { ReactNode } from "react";

interface SettingsFieldProps {
  /** Field name, shown above the control. */
  label: ReactNode;
  /** Help text shown under the control. */
  description?: ReactNode;
  /** `id` of the control, so clicking the label focuses it. */
  htmlFor?: string;
  children: ReactNode;
}

/**
 * One labelled control inside a SettingsSection body.
 *
 * Every settings form repeats the same label / control / help-text stack, so it
 * lives here rather than being re-spaced per field. Stack several inside a
 * section body with `grid gap-5`. Shared across apps.
 */
export function SettingsField({
  label,
  description,
  htmlFor,
  children,
}: SettingsFieldProps) {
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
        <p className="mt-1.5 text-pretty text-xs leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
