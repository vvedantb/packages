# Button

Source: `src/ui/button.tsx`. Web gallery: `apps/ui-gallery`, section `button`.

## Default usage

```tsx
import { Button } from "@vvedantb/ui";

<Button onClick={save}>Save</Button>;
```

`variant` defaults to `"default"`, `size` to `"default"` and `shape` to `"pill"`.

## Variants, sizes and shapes

| Prop | Values |
| --- | --- |
| `variant` | `default`, `primary` (alias of `default`), `secondary`, `outline`, `ghost`, `tertiary` (alias of `ghost`), `destructive`, `danger` (alias of `destructive`), `flat`, `success`, `warning`, `link` |
| `size` | `default`, `md` (alias of `default`, `h-10`), `xs` (`h-7`), `sm` (`h-8`), `lg` (`h-11`), `icon` (`h-10 w-10`), `icon-sm` (`h-8 w-8`), `icon-xs` (`h-7 w-7`) |
| `shape` | `pill` (default, `rounded-full`), `rounded` (`rounded-lg`; `rounded-md` for `xs` and `icon-xs`) |

Other props: `asChild`, `startContent`, `endContent` (both ignored with `asChild`), and `loading` (disables the button, sets `data-loading` and shows a spinner in place of `startContent`). It also takes every `<button>` attribute.

`buttonVariants({ variant, size, shape })` returns the same classes for links and other elements.

## Composition

```tsx
import { IconTrash } from "@tabler/icons-react";
import { Button, buttonVariants } from "@vvedantb/ui";

<div className="flex gap-2">
  <Button variant="tertiary">Cancel</Button>
  <Button variant="danger" startContent={<IconTrash />} loading={pending}>
    Delete
  </Button>
  <a href="/docs" className={buttonVariants({ variant: "outline" })}>
    Docs
  </a>
</div>;
```

## Native equivalent

`Button` in `@vvedantb/native-ui`. It takes `variant` and `shape` like the web button. Its sizes are `small`, `medium`, `large`, `sm`, `md`, `default`, `lg` and `icon`; it has no `xs`, `icon-sm` or `icon-xs`.
