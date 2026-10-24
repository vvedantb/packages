import { cn } from "../utils/cn";
import { Spinner } from "./spinner";

/**
 * A loading state for a pane, list or page: {@link Spinner} (with the app's
 * `UiConfig.Spinner` mark, if any), centred in whatever box it is given.
 * `label` names the spinner for assistive tech.
 *
 * A spinner says "wait" as well as a skeleton does, and never has to be
 * re-shaped when the content changes.
 */
export function CenteredSpinner({
  label,
  className,
  ...props
}: React.ComponentProps<"div"> & { label: string }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "flex min-h-0 w-full flex-1 items-center justify-center p-6",
        className,
      )}
      {...props}
    >
      <Spinner aria-label={label} />
    </div>
  );
}
