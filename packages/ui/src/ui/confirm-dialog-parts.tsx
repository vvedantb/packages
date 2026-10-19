import * as React from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { confirmFieldLabelClass } from "../../shell/src/app-shell-classes";
import { cn } from "../utils/cn";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
} from "./alert-dialog";
import { Button, type ButtonProps } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Input } from "./input";

export type ConfirmDialogSize = "default" | "sm" | "md";

type ConfirmDialogContextValue = {
  size: ConfirmDialogSize;
  alert: boolean;
  pending: boolean;
  confirmPhrase: string | undefined;
  typed: string;
  setTyped: (value: string) => void;
  phraseMatches: boolean;
  /** Calls the Root's `onOpenChange(false)` unless `pending`. */
  requestClose: () => void;
};

const ConfirmDialogContext = React.createContext<ConfirmDialogContextValue>({
  size: "default",
  alert: true,
  pending: false,
  confirmPhrase: undefined,
  typed: "",
  setTyped: () => {},
  phraseMatches: true,
  requestClose: () => {},
});

/** State of the nearest `ConfirmDialog.Root`, for custom parts. */
export function useConfirmDialog(): ConfirmDialogContextValue {
  return React.useContext(ConfirmDialogContext);
}

export type ConfirmDialogRootProps = React.ComponentProps<typeof Dialog> & {
  /** Layout slot for the other parts. Default `"default"`. */
  size?: ConfirmDialogSize;
  /** Blocking alert dialog: no outside dismiss, no close button, Cancel focused. Default `size === "default"`. */
  alert?: boolean;
  /**
   * While `true`, close requests (Escape, outside click, close button, Cancel)
   * are swallowed, Cancel is disabled and Action shows its pending state.
   * Needs a controlled `open`.
   */
  pending?: boolean;
  /** Type-to-confirm phrase for `ConfirmDialog.Field`. Action stays disabled until it matches (trimmed, case-insensitive). */
  confirmPhrase?: string;
};

function Root({
  size = "default",
  alert = size === "default",
  pending = false,
  confirmPhrase,
  open,
  onOpenChange,
  children,
  ...props
}: ConfirmDialogRootProps) {
  const [typed, setTyped] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTyped("");
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && pending) return;
    if (next) setTyped("");
    onOpenChange?.(next);
  };

  const phraseMatches =
    confirmPhrase === undefined ||
    typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();

  return (
    <ConfirmDialogContext.Provider
      value={{
        size,
        alert,
        pending,
        confirmPhrase,
        typed,
        setTyped,
        phraseMatches,
        requestClose: () => handleOpenChange(false),
      }}
    >
      <Dialog {...props} open={open} onOpenChange={handleOpenChange}>
        {children}
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}
Root.displayName = "ConfirmDialog.Root";

export type ConfirmDialogContentProps = React.ComponentProps<typeof DialogContent>;

/** Alert or plain dialog content (from Root `alert`); `sm` and `md` cap the width. */
function Content({ className, ...props }: ConfirmDialogContentProps) {
  const { size, alert } = useConfirmDialog();
  const Comp = alert ? AlertDialogContent : DialogContent;
  return <Comp {...props} className={cn(size !== "default" && "sm:max-w-96", className)} />;
}
Content.displayName = "ConfirmDialog.Content";

export type ConfirmDialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

function Header({ className, ...props }: ConfirmDialogHeaderProps) {
  const { size } = useConfirmDialog();
  return <DialogHeader {...props} className={cn(size === "md" && "pb-4", className)} />;
}
Header.displayName = "ConfirmDialog.Header";

export type ConfirmDialogTitleProps = React.ComponentProps<typeof DialogTitle>;

function Title({ className, ...props }: ConfirmDialogTitleProps) {
  const { size } = useConfirmDialog();
  return <DialogTitle {...props} className={cn(size === "sm" && "mb-2 text-sm font-medium", className)} />;
}
Title.displayName = "ConfirmDialog.Title";

export type ConfirmDialogDescriptionProps = React.ComponentProps<typeof DialogDescription>;

function Description({ className, ...props }: ConfirmDialogDescriptionProps) {
  const { size } = useConfirmDialog();
  return (
    <DialogDescription
      {...props}
      className={cn(
        size === "sm" && "mb-4 text-sm text-muted-foreground",
        size === "md" && "py-6 text-muted-foreground",
        className,
      )}
    />
  );
}
// Matched by `DialogContent` when it checks an alert dialog for a description.
Description.displayName = "ConfirmDialog.Description";

export type ConfirmDialogBodyProps = React.ComponentProps<"div">;

/** Plain `<div>` for extra content. No default classes. */
function Body(props: ConfirmDialogBodyProps) {
  return <div {...props} />;
}
Body.displayName = "ConfirmDialog.Body";

export type ConfirmDialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

function Footer({ className, ...props }: ConfirmDialogFooterProps) {
  const { size } = useConfirmDialog();
  if (size === "sm") return <div {...props} className={cn("flex justify-end gap-2", className)} />;
  return <DialogFooter {...props} className={cn(size === "md" && "pt-4", className)} />;
}
Footer.displayName = "ConfirmDialog.Footer";

export type ConfirmDialogCancelProps = ButtonProps;

/**
 * Alert: a `DialogClose` outline button. Otherwise a ghost button that runs
 * `onClick` and then, unless it called `preventDefault()`, the Root's
 * `onOpenChange(false)`. Disabled while pending.
 */
function Cancel({ children = "Cancel", variant, size, disabled, onClick, ...props }: ConfirmDialogCancelProps) {
  const dialog = useConfirmDialog();
  if (dialog.alert) {
    return (
      <AlertDialogCancel
        variant={variant}
        size={size}
        {...props}
        onClick={onClick}
        disabled={disabled || dialog.pending}
      >
        {children}
      </AlertDialogCancel>
    );
  }
  return (
    <Button
      variant={variant ?? "ghost"}
      size={size ?? (dialog.size === "sm" ? "sm" : undefined)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) dialog.requestClose();
      }}
      disabled={disabled || dialog.pending}
    >
      {children}
    </Button>
  );
}
Cancel.displayName = "ConfirmDialog.Cancel";

export type ConfirmDialogActionProps = ButtonProps & {
  /** Default from Root `pending`. Disables the button. */
  pending?: boolean;
  /** Shown with a spinner while pending. Without it the children stay. */
  pendingLabel?: React.ReactNode;
  /** Spinner size in px. Default `14`. */
  spinnerSize?: number;
};

/** Confirm button. Does not close the dialog. Disabled while pending or until the confirm phrase matches. */
function Action({
  pending: pendingProp,
  pendingLabel,
  spinnerSize = 14,
  size,
  disabled,
  children,
  ...props
}: ConfirmDialogActionProps) {
  const dialog = useConfirmDialog();
  const pending = pendingProp ?? dialog.pending;
  const content =
    pending && pendingLabel !== undefined ? (
      <>
        <IconLoader2 size={spinnerSize} className="animate-spin" />
        {pendingLabel}
      </>
    ) : (
      children
    );
  const isDisabled = disabled || pending || !dialog.phraseMatches;
  if (dialog.alert) {
    return (
      <AlertDialogAction size={size} {...props} disabled={isDisabled}>
        {content}
      </AlertDialogAction>
    );
  }
  return (
    <Button size={size ?? (dialog.size === "sm" ? "sm" : undefined)} {...props} disabled={isDisabled}>
      {content}
    </Button>
  );
}
Action.displayName = "ConfirmDialog.Action";

export type ConfirmDialogFieldProps = {
  /** Replaces the whole label content. Default "Type <phrase> to confirm". */
  label?: React.ReactNode;
  /** Enter in the input, only while the phrase matches and not pending. */
  onEnter?: () => void;
  className?: string;
  /** Spread onto the `Input`; `id` also sets the label `htmlFor`. */
  inputProps?: Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange">;
};

/** Type-to-confirm input bound to the Root `confirmPhrase`. */
function Field({ label, onEnter, className, inputProps }: ConfirmDialogFieldProps) {
  const { confirmPhrase = "", typed, setTyped, phraseMatches, pending } = useConfirmDialog();
  const autoId = React.useId();
  const { id = autoId, onKeyDown, ...rest } = inputProps ?? {};
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className={confirmFieldLabelClass}>
        {label ?? (
          <>
            Type{" "}
            <span className="font-mono text-foreground">{confirmPhrase}</span>{" "}
            to confirm
          </>
        )}
      </label>
      <Input
        id={id}
        autoComplete="off"
        autoFocus
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        disabled={pending}
        placeholder={confirmPhrase}
        {...rest}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key !== "Enter" || !phraseMatches || pending) return;
          event.preventDefault();
          onEnter?.();
        }}
      />
    </div>
  );
}
Field.displayName = "ConfirmDialog.Field";

export const ConfirmDialogParts = {
  Root,
  Content,
  Header,
  Title,
  Description,
  Body,
  Footer,
  Cancel,
  Action,
  Field,
};
