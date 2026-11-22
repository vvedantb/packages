# Badge

Source: `src/ui/badge.tsx`. Web gallery: `apps/ui-gallery`, section `display`.

## Default usage

```tsx
import { Badge } from "@vvedantb/ui";

<Badge>Draft</Badge>;
```

## Variants

| `variant` | Use |
| --- | --- |
| `default` (default) | Neutral |
| `secondary` | Neutral, lower emphasis |
| `outline` | Border only |
| `success` | Positive status |
| `warning` | Caution status |
| `destructive` | Error status |
| `destructive-soft` | Faint danger tint, such as revoked or expired |

`Badge` renders a `div` and takes every `div` attribute. `badgeVariants({ variant })` returns the class recipe.

## Composition

```tsx
<div className="flex items-center gap-2">
  <span>Referral 1042</span>
  <Badge variant="warning">Awaiting panel</Badge>
</div>
```

## Native equivalent

`Badge` in `@vvedantb/native-ui`.
