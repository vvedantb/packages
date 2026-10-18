import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

export type ConfirmDialogProps = React.ComponentProps<typeof AlertDialog> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  onCancel?: () => void;
  onConfirm?: () => void;
  variant?: "default" | "destructive";
  confirmDisabled?: boolean;
  /**
   * `"default"`: blocking alert dialog that closes on either button.
   * `"sm"`: compact dismissible dialog (outside click, Escape and the close
   * button close it). Confirm does not close it; the caller controls `open`.
   */
  size?: "default" | "sm";
};

function ConfirmDialog({
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
  if (size === "sm") {
    return (
      <Dialog {...props}>
        {children}
        <DialogContent className="sm:max-w-96">
          <DialogTitle className="mb-2 text-sm font-medium">{title}</DialogTitle>
          {description != null ? (
            <DialogDescription className="mb-4 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCancel?.();
                props.onOpenChange?.(false);
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant}
              size="sm"
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <AlertDialog {...props}>
      {children}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description != null ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDialog };
