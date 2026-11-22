# AlertDialog

Source: `src/ui/alert-dialog.tsx`. Web gallery: `apps/ui-gallery`, section `overlays`.

A blocking dialog: `role="alertdialog"`, no close button, no outside dismiss. Cancel takes focus on open. It needs a description (`AlertDialogDescription` or `aria-describedby`).

## Default usage

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "@vvedantb/ui";

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="danger">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this item?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="danger" onClick={remove}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

## Parts

| Part | Notes |
| --- | --- |
| `AlertDialog` | Same as `Dialog` (`open`, `onOpenChange`) |
| `AlertDialogContent` | `DialogContent` with `hideCloseButton` defaulting to `true` |
| `AlertDialogCancel` | `Button` inside `DialogClose`. `variant` defaults to `outline` |
| `AlertDialogAction` | `Button`. It does not close the dialog by itself: control `open` |
| `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogTrigger`, `AlertDialogPortal`, `AlertDialogOverlay` | Same as the `Dialog` parts |

## Composition

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    {/* header */}
    <AlertDialogFooter>
      <AlertDialogCancel>Keep</AlertDialogCancel>
      <AlertDialogAction
        onClick={async () => {
          await remove();
          setOpen(false);
        }}
      >
        Remove
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Native equivalent

`AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction` and `AlertDialogCancel` in `@vvedantb/native-ui`.
