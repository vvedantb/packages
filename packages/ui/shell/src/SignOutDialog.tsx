import { IconAlertTriangle } from "@tabler/icons-react";
import { ConfirmDialog } from "../../src/ui/confirm-dialog";
import { cn } from "../../src/utils/cn";
import { signOutCancelClass, signOutDescriptionClass } from "./app-shell-classes";

export type SignOutDialogProps = {
  open: boolean;
  /** Not called with `false` while `pending`, so the dialog stays open during sign-out. */
  onOpenChange: (open: boolean) => void;
  /** Disables both buttons and shows "Signing out...". */
  pending: boolean;
  onConfirm: () => void | Promise<void>;
  /** Second line under the question. */
  description?: string;
  /** Merged onto the dialog content after `sm:max-w-sm`. */
  contentClassName?: string;
  /** Legacy (still supported): dialog title and confirm button label. Default `"Sign out"`. */
  title?: string;
  /** Legacy (still supported): default `"Sign out of your account?"`. */
  question?: string;
};

/** Sign-out confirmation. The app owns the state and the sign-out call. Composed from `ConfirmDialog` parts. */
export function SignOutDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
  description,
  contentClassName,
  title = "Sign out",
  question = "Sign out of your account?",
}: SignOutDialogProps) {
  return (
    <ConfirmDialog.Root open={open} onOpenChange={onOpenChange} alert={false} pending={pending}>
      <ConfirmDialog.Content className={cn("sm:max-w-sm", contentClassName)}>
        <ConfirmDialog.Header>
          <ConfirmDialog.Title className="text-foreground">{title}</ConfirmDialog.Title>
          <ConfirmDialog.Description className="sr-only">
            Confirm signing out of your account
          </ConfirmDialog.Description>
        </ConfirmDialog.Header>
        <ConfirmDialog.Body className="flex items-start gap-3 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-danger/10">
            <IconAlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <p className="text-foreground">{question}</p>
            {description ? <p className={signOutDescriptionClass}>{description}</p> : null}
          </div>
        </ConfirmDialog.Body>
        <ConfirmDialog.Footer>
          <ConfirmDialog.Cancel className={signOutCancelClass} />
          <ConfirmDialog.Action
            onClick={() => void onConfirm()}
            pendingLabel="Signing out..."
            spinnerSize={16}
            className="bg-danger text-danger-foreground"
          >
            {title}
          </ConfirmDialog.Action>
        </ConfirmDialog.Footer>
      </ConfirmDialog.Content>
    </ConfirmDialog.Root>
  );
}
