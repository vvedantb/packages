import * as React from "react";
import { ConfirmDialogParts as Parts, type ConfirmDialogRootProps } from "./confirm-dialog-parts";

export { useConfirmDialog } from "./confirm-dialog-parts";
export type {
  ConfirmDialogActionProps,
  ConfirmDialogBodyProps,
  ConfirmDialogCancelProps,
  ConfirmDialogContentProps,
  ConfirmDialogDescriptionProps,
  ConfirmDialogFieldProps,
  ConfirmDialogFooterProps,
  ConfirmDialogHeaderProps,
  ConfirmDialogRootProps,
  ConfirmDialogSize,
  ConfirmDialogTitleProps,
} from "./confirm-dialog-parts";

export type ConfirmDialogProps = Omit<
  ConfirmDialogRootProps,
  "size" | "alert" | "pending" | "confirmPhrase"
> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Legacy (still supported): compose `ConfirmDialog.Cancel` instead. */
  cancelLabel?: React.ReactNode;
  /** Legacy (still supported): compose `ConfirmDialog.Action` instead. */
  confirmLabel?: React.ReactNode;
  onCancel?: () => void;
  onConfirm?: () => void;
  /** Legacy (still supported): pass `variant` to `ConfirmDialog.Action` instead. */
  variant?: "default" | "destructive";
  confirmDisabled?: boolean;
  /**
   * Legacy (still supported): use `ConfirmDialog.Root size` with the parts.
   *
   * `"default"`: blocking alert dialog that closes on either button.
   * `"sm"`: compact dismissible dialog (outside click, Escape and the close
   * button close it). Confirm does not close it; the caller controls `open`.
   * `"md"`: dismissible dialog like `"sm"`, with a header, description and
   * footer in separate sections and default-size buttons.
   */
  size?: "default" | "sm" | "md";
};

function LegacyConfirmDialog({
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  variant = "default",
  confirmDisabled,
  size = "default",
  children,
  ...props
}: ConfirmDialogProps) {
  const titleNode = <Parts.Title>{title}</Parts.Title>;
  const descriptionNode =
    description != null ? <Parts.Description>{description}</Parts.Description> : null;
  return (
    <Parts.Root {...props} size={size}>
      {children}
      <Parts.Content>
        {size === "sm" ? (
          <>
            {titleNode}
            {descriptionNode}
          </>
        ) : size === "md" ? (
          <>
            <Parts.Header>{titleNode}</Parts.Header>
            {descriptionNode}
          </>
        ) : (
          <Parts.Header>
            {titleNode}
            {descriptionNode}
          </Parts.Header>
        )}
        <Parts.Footer>
          {/* The alert cancel passes the click event on; sm and md call onCancel bare. */}
          <Parts.Cancel onClick={size === "default" ? onCancel : () => onCancel?.()}>
            {cancelLabel}
          </Parts.Cancel>
          <Parts.Action variant={variant} disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </Parts.Action>
        </Parts.Footer>
      </Parts.Content>
    </Parts.Root>
  );
}
LegacyConfirmDialog.displayName = "ConfirmDialog";

/**
 * Confirm dialog. Call it with props (the legacy prop-driven API), or compose
 * the parts: `ConfirmDialog.Root`, `.Content`, `.Header`, `.Title`,
 * `.Description`, `.Body`, `.Footer`, `.Cancel`, `.Action` and `.Field`.
 */
const ConfirmDialog = Object.assign(LegacyConfirmDialog, Parts);

export { ConfirmDialog };
