# Input

Source: `src/ui/input.tsx`. Web gallery: `apps/ui-gallery`, section `input`.

## Default usage

```tsx
import { Input } from "@vvedantb/ui";

<Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />;
```

## Props

`Input` takes every `<input>` attribute and a forwarded `ref`. It has no variant or size props. `className` merges after the built-in field classes. `UiConfig.Input.classes.base` replaces the built-in classes.

## Composition

Use `Field` when the input has a label, a hint or an error. See [field.md](field.md). For a search box use [search-input.md](search-input.md).

```tsx
<Input type="email" autoComplete="email" disabled={pending} className="max-w-xs" />
```

## Native equivalent

`Input` in `@vvedantb/native-ui`.
