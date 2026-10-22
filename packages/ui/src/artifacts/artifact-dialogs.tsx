import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useRequestConfirm } from "../../app/src/confirm/useRequestConfirm";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Input } from "../ui/input";

export type ArtifactRenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  onSave: () => void;
  pending?: boolean;
};

/** "Rename artifact" dialog with one name field. Enter saves. Save stays disabled while the name is blank. */
export function ArtifactRenameDialog({ open, onOpenChange, value, onValueChange, onSave, pending }: ArtifactRenameDialogProps) {
  const blank = value.trim().length === 0;
  return (
    <ConfirmDialog.Root alert={false} pending={pending} open={open} onOpenChange={onOpenChange}>
      <ConfirmDialog.Content className="max-w-sm">
        <ConfirmDialog.Header>
          <ConfirmDialog.Title>Rename artifact</ConfirmDialog.Title>
          <ConfirmDialog.Description>Choose a new name.</ConfirmDialog.Description>
        </ConfirmDialog.Header>
        <Input
          autoFocus
          value={value}
          aria-label="Artifact name"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || blank || pending) return;
            event.preventDefault();
            onSave();
          }}
        />
        <ConfirmDialog.Footer>
          <ConfirmDialog.Cancel variant="secondary" />
          <ConfirmDialog.Action disabled={blank} onClick={onSave}>
            Save
          </ConfirmDialog.Action>
        </ConfirmDialog.Footer>
      </ConfirmDialog.Content>
    </ConfirmDialog.Root>
  );
}

export type ArtifactDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => void;
  pending?: boolean;
  /** Text under the title. Defaults to "This cannot be undone." */
  description?: ReactNode;
};

/** "Delete <title>?" confirmation. Cancel is focused on open. */
export function ArtifactDeleteDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
  pending,
  description = "This cannot be undone.",
}: ArtifactDeleteDialogProps) {
  return (
    <ConfirmDialog.Root alert={false} focusCancel pending={pending} open={open} onOpenChange={onOpenChange}>
      <ConfirmDialog.Content className="max-w-sm" role="alertdialog">
        <ConfirmDialog.Header>
          <ConfirmDialog.Title>Delete &quot;{title}&quot;?</ConfirmDialog.Title>
          <ConfirmDialog.Description>{description}</ConfirmDialog.Description>
        </ConfirmDialog.Header>
        <ConfirmDialog.Footer>
          <ConfirmDialog.Cancel variant="secondary" />
          <ConfirmDialog.Action variant="destructive" onClick={onConfirm}>
            Delete
          </ConfirmDialog.Action>
        </ConfirmDialog.Footer>
      </ConfirmDialog.Content>
    </ConfirmDialog.Root>
  );
}

export type ArtifactEditCallbacks = {
  /** Called with the trimmed new title. The dialog closes when it resolves and stays open when it rejects. */
  onRename?: (title: string) => void | Promise<void>;
  /** Called after the delete dialog, or straight away on an Alt-click. */
  onDelete?: () => void | Promise<void>;
  /** Text under the delete dialog's title, e.g. for a host that can undo. Defaults to "This cannot be undone." */
  deleteDescription?: ReactNode;
};

/**
 * Rename and delete dialog state shared by the card and the viewer. `dialogs`
 * must be rendered; `requestDelete(event)` skips the dialog on an Alt-click.
 */
export function useArtifactEditDialogs({ title, onRename, onDelete, deleteDescription }: ArtifactEditCallbacks & { title: string }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const { request } = useRequestConfirm();

  const run = async (action: () => void | Promise<void>, failure: string, close: () => void) => {
    setPending(true);
    try {
      await action();
      close();
    } catch {
      toast.error(failure);
    } finally {
      setPending(false);
    }
  };

  const rename = () => {
    const next = renameValue.trim();
    if (!onRename || next.length === 0) return;
    if (next === title) {
      setRenameOpen(false);
      return;
    }
    void run(() => onRename(next), "Couldn't rename artifact", () => setRenameOpen(false));
  };

  const remove = () => {
    if (!onDelete) return;
    void run(onDelete, "Couldn't delete artifact", () => setDeleteOpen(false));
  };

  const dialogs: ReactNode = (
    <>
      {onRename ? (
        <ArtifactRenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          value={renameValue}
          onValueChange={setRenameValue}
          onSave={rename}
          pending={pending}
        />
      ) : null}
      {onDelete ? (
        <ArtifactDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={title}
          onConfirm={remove}
          pending={pending}
          description={deleteDescription}
        />
      ) : null}
    </>
  );

  return {
    startRename: () => {
      setRenameValue(title);
      setRenameOpen(true);
    },
    requestDelete: (event?: { altKey?: boolean }) => request(() => setDeleteOpen(true), remove, event),
    dialogs,
  };
}
