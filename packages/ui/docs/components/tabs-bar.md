# TabsBar

Source: `src/ui/tabs.tsx`. Web gallery: `apps/ui-gallery`, section `tabs`.

A page or panel tab strip: a `TabsList` on the hairline above the content, with an optional trailing `actions` slot.

## Default usage

```tsx
import { Tabs, TabsBar, TabsContent, TabsList, TabsTrigger } from "@vvedantb/ui";

<Tabs defaultValue="all">
  <TabsBar>
    <TabsList>
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="open">Open</TabsTrigger>
    </TabsList>
  </TabsBar>
  <TabsContent value="all">…</TabsContent>
  <TabsContent value="open">…</TabsContent>
</Tabs>;
```

## Props

| Prop | Values |
| --- | --- |
| `size` | `default` (`px-3 py-2`), `sm` (`px-2 py-1.5`) |
| `actions` | Node placed at the end of the bar |
| `className` | Overrides the padding |

It takes every `div` attribute. `tabsBarVariants({ size })` returns the class recipe.

## Composition

```tsx
<TabsBar size="sm" actions={<Button size="sm">New</Button>}>
  <TabsList variant="soft">…</TabsList>
</TabsBar>
```

## Native equivalent

None. `TabsBar` is web only. Use `Tabs` or `PillTabs` in `@vvedantb/native-ui`.
