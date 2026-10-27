import { Button, type ButtonProps } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogContentProps,
  type DialogProps,
} from "./Dialog";
import { useOverlay } from "./primitives/overlay";

export type AlertDialogProps = DialogProps;

/** A `Dialog` whose content blocks backdrop taps. Android back still closes it, as Escape does on the web. */
export function AlertDialog(props: AlertDialogProps) {
  return <Dialog {...props} />;
}

export const AlertDialogTrigger = DialogTrigger;

export type AlertDialogContentProps = Omit<DialogContentProps, "dismissible">;

/** `DialogContent` with no backdrop dismiss and, by default, no close button. */
export function AlertDialogContent({
  hideCloseButton = true,
  ...props
}: AlertDialogContentProps) {
  return (
    <DialogContent hideCloseButton={hideCloseButton} dismissible={false} {...props} />
  );
}

export const AlertDialogHeader = DialogHeader;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;

/**
 * Confirm button. As on the web it does not close the dialog: close it in
 * `onPress` (set `open` to false). Not full width by default, for the row
 * footer.
 */
export function AlertDialogAction(props: ButtonProps) {
  return <Button shadowType="flat" fullWidth={false} {...props} />;
}

/**
 * Cancel button: runs `onPress`, then closes the dialog. Default variant
 * `outline`, as on the web, and not full width.
 */
export function AlertDialogCancel({
  variant = "outline",
  onPress,
  ...props
}: ButtonProps) {
  const { setOpen } = useOverlay("AlertDialogCancel");
  return (
    <Button
      variant={variant}
      shadowType="flat"
      fullWidth={false}
      {...props}
      onPress={() => {
        onPress?.();
        setOpen(false);
      }}
    />
  );
}
