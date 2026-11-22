# Sheet

Source: `src/ui/sheet.tsx`. Web gallery: `apps/ui-gallery`, section `overlays`. Built on `vaul`. Each part also exports as `Drawer*`.

## Default usage

```tsx
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@vvedantb/ui";

<Sheet>
  <SheetTrigger asChild>
    <Button>Open</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
      <SheetDescription>Narrow the list.</SheetDescription>
    </SheetHeader>
    <SheetFooter>
      <SheetClose asChild>
        <Button>Apply</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>;
```

## Props

| Part | Prop | Values |
| --- | --- | --- |
| `Sheet` | `direction` | `bottom` (default), `top`, `left`, `right`. Plus the `vaul` root props. `shouldScaleBackground` defaults to `false` |
| `SheetContent` | `side` | Defaults to the `Sheet` `direction` |
| `SheetContent` | `motionBlur` | Blur while it slides or drags. Default `false` |
| `SheetContent` | `surfaceClassName` | Classes for the visible surface |

Other parts: `SheetTrigger`, `SheetClose`, `SheetHandle`, `SheetTitle`, `SheetDescription`, `SheetHeader`, `SheetFooter`, `SheetPortal`, `SheetOverlay`.

## Composition

```tsx
<Sheet direction="right">
  <SheetTrigger asChild>
    <Button variant="outline">Details</Button>
  </SheetTrigger>
  <SheetContent motionBlur>
    <SheetHeader>
      <SheetTitle>Details</SheetTitle>
    </SheetHeader>
  </SheetContent>
</Sheet>
```

## Native equivalent

`Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetBody`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetHandle` and `SheetClose` in `@vvedantb/native-ui`.
