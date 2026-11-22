# SearchInput

Source: `src/ui/search-input.tsx`. Web gallery: `apps/ui-gallery`, section `input`.

## Default usage

`value` and `onChange` are required. `onChange` receives the string, not an event.

```tsx
import { SearchInput } from "@vvedantb/ui";

const [query, setQuery] = useState("");

<SearchInput value={query} onChange={setQuery} />;
```

A clear button shows while the value is not empty.

## Props

| Prop | Values |
| --- | --- |
| `size` | `sm` (default, `h-8`), `md` and `default` (`h-10`) |
| `variant` | `default`, `toolbar` (transparent until hover or focus, fixed width from `sm`) |
| `label` | `aria-label`, and the placeholder when `placeholder` is not set. Default `"Search"` |
| `shortcut` | Key hint on the right while the value is empty, such as `"/"` |
| `onClear` | Called after `onChange` whenever the value becomes empty |
| `clearLabel` | Label of the clear button. Default `"Clear search"` |
| `inputClassName`, `wrapperClassName`, `className` | Class hooks |

It also takes the `ClearInput` props, such as `animation` and `clearButton`.

## Composition

```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  onClear={() => setPage(1)}
  variant="toolbar"
  shortcut="/"
  placeholder="Search referrals"
/>
```

## Native equivalent

`SearchInput` in `@vvedantb/native-ui`.
