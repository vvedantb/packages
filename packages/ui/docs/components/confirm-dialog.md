# ConfirmDialog

Source: `src/ui/confirm-dialog.tsx`, `src/ui/confirm-dialog-parts.tsx`. Web gallery: `apps/ui-gallery`, section `overlays`.

## Default usage

The prop API. `children` render outside the dialog, so put a `DialogTrigger` there. Confirm does not close the dialog: control `open`.

```tsx
import { Button, ConfirmDialog, DialogTrigger } from "@vvedantb/ui";

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Archive this thread?"
  description="You can restore it later."
  confirmLabel="Archive"
  onConfirm={() => setOpen(false)}
>
  <DialogTrigger asChild>
    <Button variant="outline">Archive</Button>
  </DialogTrigger>
</ConfirmDialog>;
```

## Props (prop API)

| Prop | Notes |
| --- | --- |
| `title`, `description`, `body` | Content. `body` renders after the description |
| `confirmLabel`, `cancelLabel` | Defaults `"Confirm"` and `"Cancel"` |
| `onConfirm`, `onCancel`, `confirmDisabled` | Handlers and state |
| `variant` | `default` or `destructive` |
| `size` | `default` (blocking alert), `sm` and `md` (dismissible, width capped at `sm:max-w-96`) |
| `pending` | Spinner on confirm, Cancel disabled, close requests wait. Needs a controlled `open` |

It also takes the `Dialog` root props (`open`, `onOpenChange`).

## Composition

The parts: `ConfirmDialog.Root`, `.Content`, `.Header`, `.Title`, `.Description`, `.Body`, `.Footer`, `.Cancel`, `.Action` and `.Field`. `Root` takes `size`, `alert`, `pending`, `dismissibleWhilePending`, `focusCancel` and `confirmPhrase`.

```tsx
<ConfirmDialog.Root open={open} onOpenChange={setOpen} confirmPhrase="delete">
  <ConfirmDialog.Content>
    <ConfirmDialog.Header>
      <ConfirmDialog.Title>Delete project</ConfirmDialog.Title>
      <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
    </ConfirmDialog.Header>
    <ConfirmDialog.Field />
    <ConfirmDialog.Footer>
      <ConfirmDialog.Cancel />
      <ConfirmDialog.Action variant="danger" onClick={remove}>
        Delete
      </ConfirmDialog.Action>
    </ConfirmDialog.Footer>
  </ConfirmDialog.Content>
</ConfirmDialog.Root>
```

## Native equivalent

`ConfirmDialog` in `@vvedantb/native-ui`.
