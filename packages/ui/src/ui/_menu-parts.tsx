import type * as React from "react";

/** `--vv-height` is optional: apps may set it to the visual viewport height. */
export const fitViewportClass =
  "max-sm:max-h-[min(70dvh,var(--vv-height,70dvh))] max-sm:overflow-y-auto";

/** Wraps a key handler so a bare Alt press does not move focus out of the menu. */
export function suppressAltKeyDown<E extends HTMLElement>(
  onKeyDown: React.KeyboardEventHandler<E> | undefined,
): React.KeyboardEventHandler<E> {
  return (event) => {
    if (event.key === "Alt") event.preventDefault();
    onKeyDown?.(event);
  };
}

/** Item row with a growing label column, used once `endContent` (or context-menu slots) are set. */
export function MenuItemRow({
  startContent,
  description,
  endContent,
  children,
}: {
  startContent?: React.ReactNode;
  description?: React.ReactNode;
  endContent?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      {startContent}
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">{children}</div>
        {description != null ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {endContent}
    </>
  );
}

/** Sub-trigger label with a leading slot; used only when `startContent` is set. */
export function SubTriggerRow({
  startContent,
  children,
}: {
  startContent: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      {startContent}
      <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {children}
      </div>
    </>
  );
}
