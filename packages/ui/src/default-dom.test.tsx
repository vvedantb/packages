// @vitest-environment happy-dom
// Default DOM guard. Renders each primitive and AI element with no
// `UiConfigProvider` and compares `document.body` (portals included) with
// tokens/test/fixtures/default-dom.json. App opt-ins (`UiConfig`, new props)
// must leave these defaults byte for byte; regenerate only for an intended
// default change, with `UPDATE_DEFAULT_DOM=1 pnpm exec vitest run src/default-dom.test.tsx`.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { IconBolt } from "@tabler/icons-react";
import * as UI from "./index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "../tokens/test/fixtures/default-dom.json");
const UPDATE = process.env.UPDATE_DEFAULT_DOM === "1";

let root: Root | null = null;

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function mount(node: ReactNode) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  root = r;
  await act(async () => r.render(<UI.TooltipProvider>{node}</UI.TooltipProvider>));
  await flush();
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  for (const name of document.body.getAttributeNames()) document.body.removeAttribute(name);
  root = null;
});

/** React `useId` values (`«r1»`, `:r1:`, `_r_1_`), also inside Radix `radix-…` ids. */
const REACT_ID = /«r[0-9a-z]+»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g;

function serialise(): string {
  const ids = new Map<string, string>();
  const attrs = document.body
    .getAttributeNames()
    .map((name) => ` ${name}="${document.body.getAttribute(name) ?? ""}"`)
    .join("");
  return `<body${attrs}>${document.body.innerHTML}</body>`
    .replace(REACT_ID, (id) => {
      const known = ids.get(id);
      if (known) return known;
      const next = `«id${ids.size}»`;
      ids.set(id, next);
      return next;
    })
    .replace(/></g, ">\n<");
}

const buttonVariants = ["default", "destructive", "outline", "secondary", "ghost", "link", "flat", "success", "warning"] as const;
const buttonSizes = ["default", "sm", "lg", "icon", "icon-sm", "icon-xs"] as const;
const badgeVariants = ["default", "secondary", "destructive", "outline"] as const;

const cases: Record<string, ReactNode> = {
  ...Object.fromEntries(buttonVariants.map((variant) => [`Button variant=${variant}`, <UI.Button variant={variant}>Go</UI.Button>])),
  ...Object.fromEntries(buttonSizes.map((size) => [`Button size=${size}`, <UI.Button size={size}><IconBolt /></UI.Button>])),
  "Button loading": <UI.Button loading>Go</UI.Button>,
  ...Object.fromEntries(badgeVariants.map((variant) => [`Badge variant=${variant}`, <UI.Badge variant={variant}>New</UI.Badge>])),
  Input: <UI.Input placeholder="Name" />,
  Textarea: <UI.Textarea placeholder="Notes" />,
  Label: <UI.Label htmlFor="x">Name</UI.Label>,
  Separator: <><UI.Separator /><UI.Separator orientation="vertical" /></>,
  Checkbox: <><UI.Checkbox /><UI.Checkbox defaultChecked /></>,
  Switch: <><UI.Switch /><UI.Switch defaultChecked /></>,
  Slider: <UI.Slider defaultValue={[40]} max={100} />,
  Progress: <UI.Progress value={40} />,
  Card: (
    <UI.Card>
      <UI.CardHeader>Title</UI.CardHeader>
      <UI.CardContent>Body</UI.CardContent>
    </UI.Card>
  ),
  Table: (
    <UI.Table>
      <UI.TableHeader><UI.TableRow><UI.TableHead>Name</UI.TableHead></UI.TableRow></UI.TableHeader>
      <UI.TableBody><UI.TableRow><UI.TableCell>Row</UI.TableCell></UI.TableRow></UI.TableBody>
    </UI.Table>
  ),
  ButtonGroup: (
    <UI.ButtonGroup>
      <UI.Button variant="outline">A</UI.Button>
      <UI.ButtonGroupSeparator />
      <UI.ButtonGroupText>B</UI.ButtonGroupText>
    </UI.ButtonGroup>
  ),
  InputGroup: (
    <UI.InputGroup>
      <UI.InputGroupAddon><UI.InputGroupText>@</UI.InputGroupText></UI.InputGroupAddon>
      <UI.InputGroupInput placeholder="handle" />
      <UI.InputGroupAddon align="inline-end"><UI.InputGroupButton>Go</UI.InputGroupButton></UI.InputGroupAddon>
    </UI.InputGroup>
  ),
  SearchInput: <UI.SearchInput value="" onChange={() => {}} />,
  ClearInput: <UI.ClearInput value="abc" onChange={() => {}} />,
  Calendar: <UI.Calendar mode="single" month={new Date(2026, 0, 1)} selected={new Date(2026, 0, 15)} />,
  "Tabs pills": (
    <UI.Tabs defaultValue="a">
      <UI.TabsList><UI.TabsTrigger value="a">A</UI.TabsTrigger><UI.TabsTrigger value="b">B</UI.TabsTrigger></UI.TabsList>
      <UI.TabsContent value="a">Panel</UI.TabsContent>
    </UI.Tabs>
  ),
  "Tabs segmented": (
    <UI.Tabs defaultValue="a">
      <UI.TabsList variant="segmented"><UI.TabsTrigger value="a">A</UI.TabsTrigger><UI.TabsTrigger value="b">B</UI.TabsTrigger></UI.TabsList>
    </UI.Tabs>
  ),
  "Tabs soft": (
    <UI.Tabs defaultValue="a">
      <UI.TabsList variant="soft"><UI.TabsTrigger value="a">A</UI.TabsTrigger><UI.TabsTrigger value="b">B</UI.TabsTrigger></UI.TabsList>
    </UI.Tabs>
  ),
  Accordion: (
    <UI.Accordion type="single" defaultValue="a" collapsible>
      <UI.AccordionItem value="a"><UI.AccordionTrigger>Q</UI.AccordionTrigger><UI.AccordionContent>A</UI.AccordionContent></UI.AccordionItem>
    </UI.Accordion>
  ),
  Collapsible: (
    <UI.Collapsible defaultOpen>
      <UI.CollapsibleTrigger>Toggle</UI.CollapsibleTrigger>
      <UI.CollapsibleContent>Body</UI.CollapsibleContent>
    </UI.Collapsible>
  ),
  Dialog: (
    <UI.Dialog open>
      <UI.DialogContent>
        <UI.DialogHeader><UI.DialogTitle>Title</UI.DialogTitle><UI.DialogDescription>Desc</UI.DialogDescription></UI.DialogHeader>
        <UI.DialogFooter><UI.Button>OK</UI.Button></UI.DialogFooter>
      </UI.DialogContent>
    </UI.Dialog>
  ),
  Sheet: (
    <UI.Sheet open>
      <UI.SheetContent><UI.SheetTitle>Title</UI.SheetTitle>Body</UI.SheetContent>
    </UI.Sheet>
  ),
  Popover: (
    <UI.Popover open>
      <UI.PopoverTrigger>Open</UI.PopoverTrigger>
      <UI.PopoverContent>Body</UI.PopoverContent>
    </UI.Popover>
  ),
  HoverCard: (
    <UI.HoverCard open>
      <UI.HoverCardTrigger>Hover</UI.HoverCardTrigger>
      <UI.HoverCardContent>Body</UI.HoverCardContent>
    </UI.HoverCard>
  ),
  Tooltip: (
    <UI.Tooltip open>
      <UI.TooltipTrigger>Tip</UI.TooltipTrigger>
      <UI.TooltipContent>Body</UI.TooltipContent>
    </UI.Tooltip>
  ),
  DropdownMenu: (
    <UI.DropdownMenu open>
      <UI.DropdownMenuTrigger>Menu</UI.DropdownMenuTrigger>
      <UI.DropdownMenuContent>
        <UI.DropdownMenuLabel>Label</UI.DropdownMenuLabel>
        <UI.DropdownMenuItem>Item</UI.DropdownMenuItem>
        <UI.DropdownMenuCheckboxItem checked>Check</UI.DropdownMenuCheckboxItem>
        <UI.DropdownMenuSeparator />
        <UI.DropdownMenuItem>Other<UI.DropdownMenuShortcut>⌘K</UI.DropdownMenuShortcut></UI.DropdownMenuItem>
      </UI.DropdownMenuContent>
    </UI.DropdownMenu>
  ),
  ContextMenu: (
    <UI.ContextMenu>
      <UI.ContextMenuTrigger>Area</UI.ContextMenuTrigger>
    </UI.ContextMenu>
  ),
  Select: (
    <UI.Select open defaultValue="a">
      <UI.SelectTrigger><UI.SelectValue /></UI.SelectTrigger>
      <UI.SelectContent>
        <UI.SelectItem value="a">A</UI.SelectItem>
        <UI.SelectItem value="b">B</UI.SelectItem>
      </UI.SelectContent>
    </UI.Select>
  ),
  Command: (
    <UI.Command>
      <UI.CommandInput placeholder="Search" />
      <UI.CommandList>
        <UI.CommandEmpty>None</UI.CommandEmpty>
        <UI.CommandGroup heading="Group"><UI.CommandItem>Item</UI.CommandItem></UI.CommandGroup>
        <UI.CommandSeparator />
      </UI.CommandList>
    </UI.Command>
  ),
  Spinner: <><UI.Spinner /><UI.Spinner size="sm" /></>,
  Conversation: (
    <UI.Conversation>
      <UI.ConversationContent>
        <UI.ConversationEmptyState title="Empty" description="Nothing yet" />
      </UI.ConversationContent>
    </UI.Conversation>
  ),
  Message: (
    <>
      <UI.Message from="user"><UI.MessageContent>Hi</UI.MessageContent></UI.Message>
      <UI.Message from="assistant"><UI.MessageContent>Hello</UI.MessageContent></UI.Message>
    </>
  ),
  Artifact: (
    <UI.Artifact>
      <UI.ArtifactHeader>
        <UI.ArtifactTitle>Title</UI.ArtifactTitle>
        <UI.ArtifactDescription>Desc</UI.ArtifactDescription>
      </UI.ArtifactHeader>
      <UI.ArtifactContent>Body</UI.ArtifactContent>
    </UI.Artifact>
  ),
};

function readFixture(): Record<string, string> {
  try {
    const parsed: Record<string, string> = JSON.parse(readFileSync(FIXTURE, "utf8"));
    return parsed;
  } catch {
    return {};
  }
}

const expected = UPDATE ? {} : readFixture();
const actual: Record<string, string> = {};

describe("default DOM", () => {
  it.each(Object.keys(cases))("%s", async (name) => {
    await mount(cases[name]);
    const html = serialise();
    actual[name] = html;
    if (UPDATE) return;
    expect(Object.keys(expected), `fixture is missing "${name}"; run with UPDATE_DEFAULT_DOM=1`).toContain(name);
    expect(html).toBe(expected[name]);
  });

  it("has no stale fixture cases", () => {
    if (UPDATE) return;
    expect(Object.keys(expected).filter((name) => !(name in cases))).toEqual([]);
  });

  afterAll(() => {
    if (!UPDATE) return;
    const sorted = Object.fromEntries(Object.keys(cases).map((name) => [name, actual[name]]));
    writeFileSync(FIXTURE, `${JSON.stringify(sorted, null, 2)}\n`);
  });
});
