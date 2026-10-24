// @vitest-environment happy-dom
// The `UiConfig` entries of Card, Table, Progress, Separator and Label:
// config absent = built-in output, config present = replaced part, explicit
// className still merges last.
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { clsx } from "clsx";
import * as rootExports from "../index";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Label } from "./label";
import { Progress } from "./progress";
import { Separator } from "./separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { UiConfigProvider, type UiConfig } from "./ui-config";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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

describe("root exports", () => {
  it("exposes the new Card parts", () => {
    for (const name of ["CardTitle", "CardDescription", "CardFooter", "CardAction"]) {
      expect(rootExports, name).toHaveProperty(name);
    }
  });
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

describe("UiConfig.cn", () => {
  const config: UiConfig = { cn: (...inputs) => clsx(inputs, "merged") };
  const nodes: Record<string, ReactElement> = {
    Card: <Card className="extra" />,
    Table: (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="extra">C</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
    Progress: <Progress value={10} />,
    Separator: <Separator />,
    Label: <Label>L</Label>,
  };

  it.each(Object.keys(nodes))("%s merges with the app merger", async (name) => {
    const host = await mount(nodes[name], config);
    expect(host.querySelector(".merged")).not.toBeNull();
  });
});
