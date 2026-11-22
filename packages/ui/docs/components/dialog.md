# Dialog

Source: `src/ui/dialog.tsx`. Web gallery: `apps/ui-gallery`, section `overlays`.

## Default usage

```tsx
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@vvedantb/ui";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>Changes save on close.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button>Done</Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

## Parts and props

`Dialog` is the Radix dialog root (`open`, `onOpenChange`, `defaultOpen`, `modal`).

| Part | Notes |
| --- | --- |
| `DialogTrigger`, `DialogClose`, `DialogPortal`, `DialogOverlay` | Radix parts |
| `DialogContent` | Props: `hideCloseButton`, `viewportAware` (default `true`: bottom sheet on compact viewports), `overlayClassName`, plus Radix content props |
| `DialogHeader`, `DialogBody`, `DialogFooter` | Layout `div`s |
| `DialogTitle`, `DialogDescription` | Radix title and description |
| `DialogRawContent` | The unstyled Radix content |

## Composition

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Rename</DialogTitle>
    </DialogHeader>
    <DialogBody>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <FieldControl />
      </Field>
    </DialogBody>
  </DialogContent>
</Dialog>
```

## Native equivalent

`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogTitle`, `DialogDescription` and `DialogClose` in `@vvedantb/native-ui`.
