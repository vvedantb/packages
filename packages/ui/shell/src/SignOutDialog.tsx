import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { Button } from "../../src/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../src/ui/dialog";
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
  /** Dialog title and confirm button label. Default `"Sign out"`. */
  title?: string;
  /** Default `"Sign out of your account?"`. */
  question?: string;
};

/** Sign-out confirmation. The app owns the state and the sign-out call. */
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className={cn("sm:max-w-sm", contentClassName)}>
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm signing out of your account
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-danger/10">
            <IconAlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <p className="text-foreground">{question}</p>
            {description ? <p className={signOutDescriptionClass}>{description}</p> : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className={signOutCancelClass}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void onConfirm()}
            disabled={pending}
            className="bg-danger text-danger-foreground"
          >
            {pending ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                Signing out...
              </>
            ) : (
              title
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
