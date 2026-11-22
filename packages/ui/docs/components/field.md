# Field

Source: `src/ui/field.tsx`. Web gallery: `apps/ui-gallery`, section `input`.

## Default usage

```tsx
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@vvedantb/ui";

<Field>
  <FieldLabel>Email</FieldLabel>
  <FieldControl type="email" />
  <FieldDescription>We never share it.</FieldDescription>
</Field>;
```

`Field` makes the control `id`, the description id and the error id. `FieldLabel` sets `htmlFor`. `FieldControl` sets `id`, `aria-describedby` (only for parts that render) and `aria-invalid` (while a `FieldError` renders). Each part must sit inside `Field`, or it throws.

## Parts

| Part | Renders | Notes |
| --- | --- | --- |
| `Field` | `div` (`grid gap-2`) | Prop `controlId` sets the control `id`. Default: a generated id |
| `FieldLabel` | `Label` | Takes `Label` props |
| `FieldControl` | `Input` | Takes `<input>` props. Your own `aria-describedby` and `aria-invalid` merge in |
| `FieldDescription` | `p` | Muted hint |
| `FieldError` | `p` with `role="alert"` | Danger colour |

## Composition

```tsx
<Field>
  <FieldLabel>Display name</FieldLabel>
  <FieldControl value={name} onChange={(event) => setName(event.target.value)} />
  {error ? <FieldError>{error}</FieldError> : null}
</Field>
```

## Native equivalent

`Field`, `FieldControl`, `FieldDescription`, `FieldError` and `FieldLabel` in `@vvedantb/native-ui`.
