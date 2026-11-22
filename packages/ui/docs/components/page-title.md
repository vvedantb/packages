# PageTitle

Source: `src/ui/page-title.tsx`. Web gallery: `apps/ui-gallery`, section `display`.

## Default usage

```tsx
import { PageTitle } from "@vvedantb/ui";

<PageTitle>Referrals</PageTitle>;
```

It renders an `h1` with `pageTitleClass`: `text-xl font-semibold leading-tight tracking-tight` (Instrument Sans, 20px, weight 600). `pageTitleClass` is exported for other elements.

## Props

`PageTitle` takes every `h1` attribute and a forwarded `ref`. `className` merges after the title class.

`PageHeader` takes `title` (node, rendered in `PageTitle`), an optional `action` slot, and every `header` attribute except `title`.

## Composition

```tsx
import { Button, PageHeader } from "@vvedantb/ui";

<PageHeader title="Referrals" action={<Button size="sm">New referral</Button>} />;
```

## Native equivalent

`PageTitle` and `PageHeader` in `@vvedantb/native-ui`. The native header adds safe-area padding; the web one does not.
