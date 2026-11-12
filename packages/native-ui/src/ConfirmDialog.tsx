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
import { impactHaptic } from "./haptics";
import { useControllableState } from "./primitives/use-controllable-state";

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
 * legacy props with `size="default"`. Every close but Confirm (Cancel, Android
 * back, the VoiceOver escape) calls `onCancel`, as the web `onOpenChange`
 * close does. The `sm` / `md` sizes and the composable `ConfirmDialog.*`
 * parts are web-only; compose `AlertDialog` parts instead.
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
  const [isOpen, setOpen] = useControllableState({ value: open, defaultValue: defaultOpen ?? false, onChange: onOpenChange });
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onCancel?.();
        setOpen(next);
      }}
    >
      {children}
      <AlertDialogContent testID={testID}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description != null ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Closes the dialog, and so calls `onCancel`. */}
          <AlertDialogCancel testID={testID ? `${testID}-cancel` : undefined}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            testID={testID ? `${testID}-confirm` : undefined}
            variant={variant}
            disabled={confirmDisabled}
            onPress={() => {
              // A destructive confirm lands with a medium haptic.
              if (variant === "destructive") impactHaptic("medium");
              onConfirm?.();
              // Past the dialog's own close, so a confirm is not a cancel.
              setOpen(false);
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
