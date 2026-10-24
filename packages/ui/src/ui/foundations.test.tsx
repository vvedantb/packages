// @vitest-environment happy-dom
// Components moved from eva (spinners, loaders, status dot, list row, beam,
// surface, avatar, alert) and the `UiConfig` entries of Card, Table, Progress,
// Separator, Label and the toaster: config absent = built-in output, config
// present = replaced part, explicit prop wins.
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import * as rootExports from "../index";
import { Alert, AlertDescription } from "./alert";
import { Avatar, AvatarFallback } from "./avatar";
import { BorderBeam } from "./border-beam";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { CenteredSpinner } from "./centered-spinner";
import { CrossfadeIcon, CrossfadeIconSlot } from "./crossfade-icon";
import { Label } from "./label";
import { LIST_ROW_CONTROL_CLASS, ListRow } from "./list-row";
import { LoadingState } from "./loading-state";
import { Progress } from "./progress";
import { RefreshSpinIcon } from "./refresh-spin-icon";
import { Separator } from "./separator";
import { SonnerToaster, Toaster } from "./sonner";
import { CircleSpinner, Spinner, type SpinnerMark } from "./spinner";
import { StatusDot } from "./status-dot";
import { Surface, surfaceVariants } from "./surface";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { UiConfigProvider, type UiConfig } from "./ui-config";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// happy-dom has no Web Animations API; the spinners and LoadingState start
// their loops with `element.animate()` from a ref callback.
const animate = vi.fn(() => ({ playState: "running", pause() {}, play() {}, cancel() {} }));
Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });

let root: Root | null = null;

async function mount(node: ReactNode, config?: UiConfig) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () =>
    created.render(config ? <UiConfigProvider config={config}>{node}</UiConfigProvider> : node),
  );
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
  animate.mockClear();
});

function el(host: ParentNode, selector: string): Element {
  const found = host.querySelector(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

function first(host: HTMLElement): Element {
  const found = host.firstElementChild;
  if (!found) throw new Error("empty host");
  return found;
}

function classes(element: Element): string[] {
  return [...element.classList].sort();
}

const mark: SpinnerMark = {
  viewBox: "0 0 10 10",
  strokeWidth: 2,
  dashArray: "0.3 0.7",
  shapes: [
    { points: "0,0 10,0 5,10", stroke: "#f00" },
    { d: "M0 5h10", stroke: "#00f" },
  ],
};

describe("root exports", () => {
  it("exposes the moved components and utils", () => {
    for (const name of [
      "Alert", "AlertDescription", "alertVariants", "Avatar", "AvatarImage", "AvatarFallback",
      "BorderBeam", "CenteredSpinner", "CircleSpinner", "CrossfadeIcon", "CrossfadeIconSlot",
      "ListRow", "LIST_ROW_CONTROL_CLASS", "LoadingState", "RefreshSpinIcon", "StatusDot",
      "Surface", "surfaceVariants", "Toaster", "CardTitle", "CardDescription", "CardFooter", "CardAction",
      "transitionFast", "transitionBase", "transitionSlow", "staggerDelay",
      "rubberband", "projectVelocity", "DRAG_ACTIVATION_DISTANCE_PX",
      "ensureRuntimeVisibility", "observeAnimVisibility", "bindRuntimeAnimation", "useAnimOffscreenRef",
      "quantizedSnapshot", "subscribeQuantized", "msUntilNextBoundary",
      "catColorForId", "catColorForSlot", "catSlotForId", "CAT_SLOT_COUNT",
      "SURFACE_RADIUS_CLASS", "CONTROL_RADIUS_CLASS",
    ]) {
      expect(rootExports, name).toHaveProperty(name);
    }
  });

  it("keeps the motion tokens on the CSS durations", () => {
    expect(rootExports.transitionFast).toMatchObject({ duration: 0.15 });
    expect(rootExports.transitionBase).toMatchObject({ duration: 0.22 });
    expect(rootExports.transitionSlow).toMatchObject({ duration: 0.32 });
    expect(rootExports.staggerDelay(2)).toBeCloseTo(0.06);
    expect(rootExports.staggerDelay(100)).toBe(0.2);
  });
});

describe("Spinner mark", () => {
  it("renders the loader icon without a mark", async () => {
    const host = await mount(<Spinner />);
    expect(classes(first(host))).toContain("animate-spin");
    expect(host.querySelector("polygon")).toBeNull();
  });

  it("draws UiConfig.Spinner.mark with a running dash per shape", async () => {
    const host = await mount(<Spinner size="sm" className="mr-1" />, { Spinner: { mark } });
    const svg = first(host);
    expect(svg.getAttribute("viewBox")).toBe("0 0 10 10");
    expect(svg.getAttribute("role")).toBe("status");
    expect(svg.getAttribute("aria-label")).toBe("Loading");
    expect(classes(svg)).toEqual(["mr-1", "size-4"]);
    const polygon = el(svg, "polygon");
    expect(polygon.getAttribute("points")).toBe("0,0 10,0 5,10");
    expect(polygon.getAttribute("stroke")).toBe("#f00");
    expect(polygon.getAttribute("stroke-dasharray")).toBe("0.3 0.7");
    expect(polygon.getAttribute("pathLength")).toBe("1");
    expect(el(svg, "path").getAttribute("d")).toBe("M0 5h10");
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("lets the mark prop win and honours decorative and pixel sizes", async () => {
    const other: SpinnerMark = { ...mark, viewBox: "0 0 20 20" };
    const host = await mount(<Spinner mark={other} decorative size={12} />, { Spinner: { mark } });
    const svg = first(host);
    expect(svg.getAttribute("viewBox")).toBe("0 0 20 20");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.getAttribute("width")).toBe("12");
    expect(svg.getAttribute("class")).toBe("");
  });
});

describe("CircleSpinner", () => {
  const strokes = (host: HTMLElement) => [...host.querySelectorAll("circle")].map((c) => c.getAttribute("stroke"));

  it("uses currentColor without config", async () => {
    const host = await mount(<CircleSpinner />);
    expect(strokes(host)).toEqual(["currentColor", "currentColor", "currentColor"]);
    expect(classes(first(host))).toEqual(["size-6"]);
  });

  it("reads UiConfig.CircleSpinner.colors; the colors prop wins", async () => {
    const config = { CircleSpinner: { colors: { track: "red", arc: "green", lead: "blue" } } };
    expect(strokes(await mount(<CircleSpinner />, config))).toEqual(["red", "green", "blue"]);
    expect(strokes(await mount(<CircleSpinner colors={{ lead: "black" }} />, config))).toEqual([
      "currentColor",
      "currentColor",
      "black",
    ]);
  });
});

it("CenteredSpinner labels the spinner and centres it", async () => {
  const host = await mount(<CenteredSpinner label="Opening" className="h-full" />);
  const box = first(host);
  expect(box.getAttribute("aria-busy")).toBe("true");
  expect(classes(box)).toContain("h-full");
  expect(el(box, "svg").getAttribute("aria-label")).toBe("Opening");
});

describe("LoadingState", () => {
  it("uses neutral defaults", async () => {
    const host = await mount(<LoadingState />);
    const label = el(host, "span.font-medium");
    expect(label.textContent).toBe("Working");
    expect(label.getAttribute("class")).toBe("text-sm font-medium text-muted-foreground");
    expect(label.getAttribute("style")).toBeNull();
    const cell = el(host, "[data-anim-chrome] > span");
    expect(cell.getAttribute("style")).toContain("background-color: currentcolor");
  });

  it("reads label, colors, label classes and labelStyle from UiConfig.LoadingState", async () => {
    const host = await mount(<LoadingState />, {
      LoadingState: {
        label: "Thinking",
        colors: ["red", "green", "blue"],
        classes: { label: "shimmer font-medium" },
        labelStyle: { letterSpacing: "1px" },
      },
    });
    const label = el(host, "span.font-medium");
    expect(label.textContent).toBe("Thinking");
    expect(label.getAttribute("class")).toBe("shimmer font-medium");
    expect(label.getAttribute("style")).toBe("letter-spacing: 1px;");
    const cells = [...host.querySelectorAll("[data-anim-chrome] > span")];
    expect(cells.map((c) => c.getAttribute("style")?.match(/background-color: (\w+)/)?.[1]).slice(0, 3)).toEqual([
      "red",
      "green",
      "blue",
    ]);
  });

  it("lets props win and names the iconOnly grid", async () => {
    const host = await mount(<LoadingState label="Now" iconOnly colors={["a", "b", "c"]} />, {
      LoadingState: { label: "Thinking" },
    });
    expect(first(host).getAttribute("aria-label")).toBe("Now");
    expect(first(host).getAttribute("role")).toBe("status");
  });
});

describe("StatusDot", () => {
  it("replaces only the configured tone classes", async () => {
    const config = { StatusDot: { classes: { tone: { done: "bg-app-done" } } } };
    expect(classes(first(await mount(<StatusDot tone="done" />, config)))).toEqual(["bg-app-done", "rounded-full", "shrink-0", "size-1.5"]);
    expect(classes(first(await mount(<StatusDot tone="critical" size="md" />, config)))).toEqual([
      "bg-destructive",
      "rounded-full",
      "shrink-0",
      "size-2",
    ]);
    expect(first(await mount(<StatusDot tone="done" />)).getAttribute("aria-hidden")).toBe("true");
  });
});

describe("ListRow", () => {
  it("renders a static row without an overlay", async () => {
    const host = await mount(<ListRow>body</ListRow>);
    expect(host.querySelector("[data-slot=row-control]")).toBeNull();
    expect(classes(first(host))).toContain("bg-card");
    expect(classes(first(host))).not.toContain("active:scale-[0.99]");
  });

  it("stretches a button for onClick and owns the click", async () => {
    const onClick = vi.fn();
    const parent = vi.fn();
    const host = await mount(
      <div onClick={parent}>
        <ListRow onClick={onClick} aria-label="Open" selected accentClassName="bg-warning">
          <button className={LIST_ROW_CONTROL_CLASS}>x</button>
        </ListRow>
      </div>,
    );
    const overlay = el(host, "button[data-slot=row-control]");
    expect(overlay.getAttribute("aria-label")).toBe("Open");
    await act(async () => (overlay as HTMLElement).click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(parent).not.toHaveBeenCalled();
    const row = el(host, ".group");
    expect(classes(row)).toEqual(expect.arrayContaining(["active:scale-[0.99]", "bg-primary/5", "ring-primary/30"]));
    expect(classes(el(row, ".bg-warning"))).toContain("rounded-r-full");
  });

  it("lets modified clicks on an href row through", async () => {
    const onClick = vi.fn();
    const host = await mount(<ListRow href="/x" onClick={onClick}>b</ListRow>);
    const link = el(host, "a[data-slot=row-control]");
    const plain = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => link.dispatchEvent(plain));
    expect(plain.defaultPrevented).toBe(true);
    const modified = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
    await act(async () => link.dispatchEvent(modified));
    expect(modified.defaultPrevented).toBe(false);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("replaces parts from UiConfig.ListRow.classes", async () => {
    const host = await mount(
      <ListRow link={<a href="/in" />} className="shrink-0" contentClassName="p-1">
        b
      </ListRow>,
      { ListRow: { classes: { root: "app-row", interactive: "app-press", overlay: "app-overlay" } } },
    );
    expect(classes(first(host))).toEqual(["app-press", "app-row", "bg-card", "hover:bg-muted", "shrink-0"]);
    expect(el(host, "a").getAttribute("class")).toBe("app-overlay");
    expect(el(host, "a").getAttribute("href")).toBe("/in");
    expect(classes(el(host, ".p-1"))).toEqual(["p-1", "relative", "text-left"]);
  });
});

describe("BorderBeam", () => {
  it("adds the beam overlay only while active", async () => {
    expect((await mount(<BorderBeam active={false}>x</BorderBeam>)).querySelector(".beam-root")).toBeNull();
    const host = await mount(
      <BorderBeam active size="lg" colorVariant="colorful" className="rounded-surface" data-x="1">
        x
      </BorderBeam>,
    );
    expect(first(host).getAttribute("data-x")).toBe("1");
    const overlay = el(host, ".beam-root");
    expect(classes(overlay)).toEqual(["beam-colorful", "beam-lg", "beam-root"]);
    expect(overlay.getAttribute("data-anim-chrome")).toBe("");
    expect(overlay.querySelector(".beam")).not.toBeNull();
  });
});

describe("CrossfadeIcon", () => {
  it("shows one keyed icon at a time", async () => {
    const host = await mount(<CrossfadeIcon show whenTrue={<b>on</b>} whenFalse={<i>off</i>} />);
    expect(host.textContent).toBe("on");
    expect(first(host).getAttribute("class")).toBe("relative flex size-5 items-center justify-center");
    const slot = await mount(<CrossfadeIconSlot iconKey="a">A</CrossfadeIconSlot>);
    expect(slot.textContent).toBe("A");
  });

  it("RefreshSpinIcon swaps the refresh glyph for a CircleSpinner while busy", async () => {
    expect((await mount(<RefreshSpinIcon busy={false} />)).querySelector("[role=status]")).toBeNull();
    expect((await mount(<RefreshSpinIcon busy />)).querySelector("[role=status]")).not.toBeNull();
  });
});

it("Surface, Avatar and Alert render their classes", async () => {
  expect(classes(first(await mount(<Surface density="tight">x</Surface>)))).toEqual(
    surfaceVariants({ density: "tight" }).split(" ").sort(),
  );
  const avatar = await mount(
    <Avatar>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>,
  );
  expect(classes(first(avatar))).toContain("rounded-full");
  expect(avatar.textContent).toBe("AB");
  const alert = await mount(
    <Alert variant="destructive">
      <AlertDescription>Oops</AlertDescription>
    </Alert>,
  );
  expect(first(alert).getAttribute("role")).toBe("alert");
  expect(classes(first(alert))).toContain("text-destructive");
});

describe("UiConfig class replacement", () => {
  const card = (
    <Card className="extra">
      <CardHeader>
        <CardTitle>T</CardTitle>
        <CardDescription>D</CardDescription>
        <CardAction>A</CardAction>
      </CardHeader>
      <CardContent>C</CardContent>
      <CardFooter>F</CardFooter>
    </Card>
  );

  it("Card keeps its defaults without config and replaces configured parts", async () => {
    const plain = await mount(card);
    expect(first(plain).getAttribute("class")).toBe("rounded-lg bg-surface-card text-surface-foreground extra");
    expect(el(plain, ".tracking-\\[-0\\.02em\\]").textContent).toBe("T");
    const host = await mount(card, { Card: { classes: { root: "app-card", header: "app-header", footer: "app-footer" } } });
    expect(first(host).getAttribute("class")).toBe("app-card extra");
    expect(el(host, ".app-header").firstElementChild?.getAttribute("class")).toBe(
      "font-semibold leading-none tracking-[-0.02em]",
    );
    expect(el(host, ".app-footer").textContent).toBe("F");
    expect(host.querySelector(".p-6.pt-0")?.textContent).toBe("C");
  });

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>H</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="x">C</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  it("Table replaces configured parts, the wrapper included", async () => {
    const plain = await mount(table);
    expect(first(plain).getAttribute("class")).toBe(
      "relative w-full overflow-auto rounded-lg max-sm:min-w-0 max-sm:max-w-full",
    );
    const host = await mount(table, { Table: { classes: { wrapper: "app-wrap", cell: "app-cell", head: "app-head" } } });
    expect(first(host).getAttribute("class")).toBe("app-wrap");
    expect(el(host, "td").getAttribute("class")).toBe("app-cell x");
    expect(el(host, "th").getAttribute("class")).toBe("app-head");
    expect(el(host, "table").getAttribute("class")).toBe("w-full caption-bottom text-sm");
  });

  it("Progress, Separator and Label replace their parts", async () => {
    const config: UiConfig = {
      Progress: { classes: { root: "app-track", indicator: "app-bar" } },
      Separator: { classes: { root: "app-sep" } },
      Label: { classes: { root: "app-label" } },
    };
    const host = await mount(
      <>
        <Progress value={40} className="h-1" />
        <Separator orientation="vertical" />
        <Label className="x">L</Label>
      </>,
      config,
    );
    expect(el(host, "[role=progressbar]").getAttribute("class")).toBe("app-track h-1");
    expect(el(host, "[role=progressbar] > div").getAttribute("class")).toBe("app-bar");
    expect(el(host, "[data-orientation=vertical]").getAttribute("class")).toBe("app-sep h-full w-px");
    expect(el(host, "label").getAttribute("class")).toBe("app-label x");
    const plain = await mount(<Separator />);
    expect(first(plain).getAttribute("class")).toBe("shrink-0 bg-separator h-px w-full");
  });
});

describe("Toaster", () => {
  function props(node: ReactElement<Record<string, unknown>>) {
    return node.props;
  }

  it("SonnerToaster classes replace toast parts and the toaster class", () => {
    const element = SonnerToaster({ classes: { toaster: "", toast: "app-toast", success: "" } });
    const { className, toastOptions } = props(element);
    expect(className).toBeUndefined();
    expect(toastOptions).toMatchObject({
      classNames: { toast: "app-toast", success: "", title: "font-medium leading-snug" },
    });
    expect(props(SonnerToaster({ classes: { toaster: "app" }, className: "x" })).className).toBe("app x");
  });

  it("renders like SonnerToaster without config", async () => {
    const a = (await mount(<Toaster theme="dark" />)).innerHTML;
    const b = (await mount(<SonnerToaster theme="dark" />)).innerHTML;
    expect(a).toBe(b);
  });

  it("takes prop defaults and classes from UiConfig.SonnerToaster", async () => {
    const host = await mount(<Toaster theme="light" gap={10} />, {
      SonnerToaster: { gap: 4, closeButton: true, classes: { toaster: "", toast: "app-toast" } },
    });
    await act(async () => {
      toast("Hello");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const list = el(host, "ol");
    expect(list.getAttribute("class")).toBeNull();
    expect(list.getAttribute("style")).toContain("--gap: 10px");
    const item = el(host, "li");
    expect(item.getAttribute("class")).toContain("app-toast");
    expect(item.querySelector("[data-close-button]")).not.toBeNull();
  });
});
