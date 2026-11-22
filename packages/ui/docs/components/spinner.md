# Spinner

Source: `src/ui/spinner.tsx`. Web gallery: `apps/ui-gallery`, section `display`.

## Default usage

```tsx
import { Spinner } from "@vvedantb/ui";

<Spinner />;
```

It renders the rotating loader icon with `role="status"` and `aria-label="Loading"`.

## Props

| Prop | Values |
| --- | --- |
| `size` | `sm` (`size-4`), `md` and `default` (`size-6`, default), `lg` (`size-8`), or a number in px. Not used with `ring` |
| `variant` | `icon` (loader icon), `circle` (faint ring with a two-tone arc), `ring` (the 16px `Button` loading ring). Without it: the configured `mark`, else the icon |
| `tone` | `muted` (default) or `inherit`. `icon` only |
| `decorative` | Hides it from assistive tech. Default `false` |
| `stroke` | Stroke width. `icon` only |
| `mark` | An outline drawn with a running dash. Default `UiConfig.Spinner.mark` |
| `colors` | Stroke colours of `circle` |

## Composition

```tsx
<Button disabled>
  <Spinner size="sm" decorative tone="inherit" />
  Saving
</Button>
```

`Button` has `loading`, which shows the `ring` variant for you.

## Native equivalent

`Spinner` in `@vvedantb/native-ui`.
