# Tabs

Source: `src/ui/tabs.tsx`. Web gallery: `apps/ui-gallery`, section `tabs`. Built on Radix Tabs.

## Default usage

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@vvedantb/ui";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview</TabsContent>
  <TabsContent value="activity">Activity</TabsContent>
</Tabs>;
```

`Tabs` is the Radix root (`value`, `onValueChange`, `defaultValue`, `orientation`).

## `TabsList` props

| Prop | Values |
| --- | --- |
| `variant` | `pills` (default: separate rounded pills), `segmented` (connected bar with a sliding pill), `soft` (borderless wrapping pills, active one filled) |
| `size` | `default`, `sm` |
| `pillMotion` | `x` (default) or `xy`. Only for `segmented` |

`TabsTrigger` and `TabsContent` take the Radix props (`value`, `disabled`). The raw `TabsPrimitive` also exports for custom layouts.

## Composition

```tsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList variant="segmented" size="sm">
    <TabsTrigger value="a">A</TabsTrigger>
    <TabsTrigger value="b">B</TabsTrigger>
  </TabsList>
  <TabsContent value="a">…</TabsContent>
  <TabsContent value="b">…</TabsContent>
</Tabs>
```

For a page-level strip, see [tabs-bar.md](tabs-bar.md).

## Native equivalent

`Tabs`, `TabsList`, `TabsTrigger` and `TabsContent` in `@vvedantb/native-ui`. It also has `PillTabs`.
