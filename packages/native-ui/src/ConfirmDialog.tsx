import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./AlertDialog";
import { useOverlay } from "./primitives/overlay";

export type ConfirmDialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Default "Cancel". */
  cancelLabel?: ReactNode;
  /** Default "Confirm". */
  confirmLabel?: ReactNode;
  onCancel?: () => void;
  onConfirm?: () => void;
  /** `"destructive"` paints the confirm button red. Default `"default"`. */
  variant?: "default" | "destructive";
  confirmDisabled?: boolean;
  /** Usually an `AlertDialogTrigger`. */
  children?: ReactNode;
  testID?: string;
};

/**
 * Blocking confirm dialog that closes on either button: the web `ConfirmDialog`
 * legacy props with `size="default"`. The `sm` / `md` sizes and the composable
 * `ConfirmDialog.*` parts are web-only; compose `AlertDialog` parts instead.
 */
export function ConfirmDialog({
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  variant = "default",
  confirmDisabled,
  children,
  testID,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
      <AlertDialogContent testID={testID}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description != null ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            testID={testID ? `${testID}-cancel` : undefined}
            onPress={onCancel}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <ConfirmAction
            testID={testID ? `${testID}-confirm` : undefined}
            variant={variant}
            disabled={confirmDisabled}
            onConfirm={onConfirm}
          >
            {confirmLabel}
          </ConfirmAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmAction({
  onConfirm,
  ...props
}: {
  onConfirm?: () => void;
  variant: "default" | "destructive";
  disabled?: boolean;
  testID?: string;
  children: ReactNode;
}) {
  const { setOpen } = useOverlay("ConfirmDialog");
  return (
    <AlertDialogAction
      {...props}
      onPress={() => {
        onConfirm?.();
        setOpen(false);
      }}
    />
  );
}
