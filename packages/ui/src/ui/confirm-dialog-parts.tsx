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
import { useUiConfig } from "./ui-config";

export type ConfirmDialogSize = "default" | "sm" | "md";

/**
 * App-wide classes for the confirm dialog parts, merged after each part's
 * size classes (so an app can tighten `md`'s padding or widen its content).
 */
export interface ConfirmDialogConfig {
  classes?: {
    content?: string;
    header?: string;
    title?: string;
    description?: string;
    body?: string;
    footer?: string;
  };
}

type ConfirmDialogContextValue = {
  size: ConfirmDialogSize;
  alert: boolean;
  pending: boolean;
  focusCancel: boolean;
  confirmPhrase: string | undefined;
  typed: string;
  setTyped: (value: string) => void;
  phraseMatches: boolean;
  /** Calls the Root's `onOpenChange(false)` unless `pending` (and not `dismissibleWhilePending`). */
  requestClose: () => void;
};

const ConfirmDialogContext = React.createContext<ConfirmDialogContextValue>({
  size: "default",
  alert: true,
  pending: false,
  focusCancel: false,
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
  /**
   * While `pending`, Escape, outside click and the close button still close
   * (Root `onOpenChange(false)` runs). Cancel stays disabled and Action stays
   * pending. Default `false`.
   */
  dismissibleWhilePending?: boolean;
  /**
   * Non-alert only: Cancel renders `data-alert-cancel=""`, so a Content with
   * `role="alertdialog"` focuses it on open. An explicit `data-alert-cancel`
   * on Cancel wins. No-op with `alert` (its Cancel already has it). Default `false`.
   */
  focusCancel?: boolean;
  /** Type-to-confirm phrase for `ConfirmDialog.Field`. Action stays disabled until it matches (trimmed, case-insensitive). */
  confirmPhrase?: string;
};

function Root({
  size = "default",
  alert = size === "default",
  pending = false,
  dismissibleWhilePending = false,
  focusCancel = false,
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
    if (!next && pending && !dismissibleWhilePending) return;
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
        focusCancel,
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
  const extra = useUiConfig("ConfirmDialog")?.classes?.content;
  const Comp = alert ? AlertDialogContent : DialogContent;
  return <Comp {...props} className={cn(size !== "default" && "sm:max-w-96", extra, className)} />;
}
Content.displayName = "ConfirmDialog.Content";

export type ConfirmDialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

function Header({ className, ...props }: ConfirmDialogHeaderProps) {
  const { size } = useConfirmDialog();
  const extra = useUiConfig("ConfirmDialog")?.classes?.header;
  return <DialogHeader {...props} className={cn(size === "md" && "pb-4", extra, className)} />;
}
Header.displayName = "ConfirmDialog.Header";

export type ConfirmDialogTitleProps = React.ComponentProps<typeof DialogTitle>;

function Title({ className, ...props }: ConfirmDialogTitleProps) {
  const { size } = useConfirmDialog();
  const extra = useUiConfig("ConfirmDialog")?.classes?.title;
  return <DialogTitle {...props} className={cn(size === "sm" && "mb-2 text-sm font-medium", extra, className)} />;
}
Title.displayName = "ConfirmDialog.Title";

export type ConfirmDialogDescriptionProps = React.ComponentProps<typeof DialogDescription>;

function Description({ className, ...props }: ConfirmDialogDescriptionProps) {
  const { size } = useConfirmDialog();
  const extra = useUiConfig("ConfirmDialog")?.classes?.description;
  return (
    <DialogDescription
      {...props}
      className={cn(
        size === "sm" && "mb-4 text-sm text-muted-foreground",
        size === "md" && "py-6 text-muted-foreground",
        extra,
        className,
      )}
    />
  );
}
// Matched by `DialogContent` when it checks an alert dialog for a description.
Description.displayName = "ConfirmDialog.Description";

export type ConfirmDialogBodyProps = React.ComponentProps<"div">;

/** Plain `<div>` for extra content. No default classes (`UiConfig.ConfirmDialog.classes.body` if set). */
function Body({ className, ...props }: ConfirmDialogBodyProps) {
  const extra = useUiConfig("ConfirmDialog")?.classes?.body;
  return <div {...props} className={cn(extra, className) || undefined} />;
}
Body.displayName = "ConfirmDialog.Body";

export type ConfirmDialogFooterProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Right-aligned row of buttons at every width, laid out like a
   * `flex justify-end gap-2` div inside the footer. Adds `justify-end flex-row!`:
   * the `!important` beats both the footer's own `flex-col-reverse` below `sm`
   * and the compact sheet's descendant `flex-col-reverse` rule, which has higher
   * specificity than a plain class. Keeps `data-slot` and every other footer
   * class. No-op for `size="sm"` (already a row). Default `false`.
   */
  row?: boolean;
};

function Footer({ row = false, className, ...props }: ConfirmDialogFooterProps) {
  const { size } = useConfirmDialog();
  const extra = useUiConfig("ConfirmDialog")?.classes?.footer;
  if (size === "sm") return <div {...props} className={cn("flex justify-end gap-2", extra, className)} />;
  return (
    <DialogFooter
      {...props}
      className={cn(size === "md" && "pt-4", row && "justify-end flex-row!", extra, className)}
    />
  );
}
Footer.displayName = "ConfirmDialog.Footer";

export type ConfirmDialogCancelProps = ButtonProps;

/**
 * Alert: a `DialogClose` outline button. Otherwise a ghost button that runs
 * `onClick` and then, unless it called `preventDefault()`, the Root's
 * `onOpenChange(false)`. Disabled while pending. With Root `focusCancel`
 * it also gets `data-alert-cancel`.
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
      data-alert-cancel={dialog.focusCancel ? "" : undefined}
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
  /** Merged into the spinner className after `animate-spin`, e.g. `"mr-2"`. */
  spinnerClassName?: string;
};

/** Confirm button. Does not close the dialog. Disabled while pending or until the confirm phrase matches. */
function Action({
  pending: pendingProp,
  pendingLabel,
  spinnerSize = 14,
  spinnerClassName,
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
        <IconLoader2 size={spinnerSize} className={cn("animate-spin", spinnerClassName)} />
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
