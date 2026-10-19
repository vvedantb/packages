// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { IconFolder, IconLink } from "@tabler/icons-react";
import * as rootExports from "../index";
import { EmptyState } from "./empty-state";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

function first(host: HTMLElement): Element {
  const found = host.firstElementChild;
  if (!found) throw new Error("empty host");
  return found;
}

function attr(element: Element | null | undefined, name: string): string | null {
  if (!element) throw new Error("missing element");
  return element.getAttribute(name);
}

describe("EmptyState", () => {
  it("is exported from the root as a namespace of parts", () => {
    for (const name of ["Root", "Icon", "Title", "Description", "Actions"]) {
      expect(rootExports.EmptyState, `EmptyState.${name}`).toHaveProperty(name);
    }
  });

  it("renders the default layout: bare icon and one muted line", async () => {
    const host = await mount(
      <EmptyState.Root className="h-full">
        <EmptyState.Icon icon={IconFolder} />
        <EmptyState.Description>No files yet.</EmptyState.Description>
      </EmptyState.Root>,
    );
    const rootEl = first(host);
    expect(attr(rootEl, "class")).toBe(
      "flex flex-col items-center justify-center text-center px-4 py-20 h-full",
    );
    const [icon, text] = rootEl.children;
    expect(icon?.tagName.toLowerCase()).toBe("svg");
    expect(attr(icon, "width")).toBe("40");
    expect(attr(icon, "stroke-width")).toBe("2");
    expect(attr(icon, "class")).toBe("tabler-icon tabler-icon-folder mb-3 text-muted-foreground");
    expect(text?.outerHTML).toBe('<p class="text-sm text-muted-foreground">No files yet.</p>');
    expect(rootEl.children).toHaveLength(2);
  });

  it("renders the panel layout: icon tile, title, description and actions", async () => {
    const host = await mount(
      <EmptyState.Root variant="panel">
        <EmptyState.Icon icon={IconLink} />
        <EmptyState.Title>No links</EmptyState.Title>
        <EmptyState.Description>Link a memory.</EmptyState.Description>
        <EmptyState.Actions>
          <button type="button">Add</button>
        </EmptyState.Actions>
      </EmptyState.Root>,
    );
    const rootEl = first(host);
    expect(attr(rootEl, "class")).toBe(
      "flex flex-col items-center justify-center text-center rounded-lg bg-surface-secondary px-4 py-10",
    );
    const [tile, title, description, actions] = rootEl.children;
    expect(attr(tile, "class")).toBe(
      "mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-surface-tertiary",
    );
    const svg = tile?.firstElementChild;
    expect(attr(svg, "width")).toBe("22");
    expect(attr(svg, "stroke-width")).toBe("1.5");
    expect(attr(svg, "class")).toBe("tabler-icon tabler-icon-link text-muted-foreground");
    expect(title?.outerHTML).toBe('<p class="text-sm font-medium text-foreground">No links</p>');
    expect(description?.outerHTML).toBe(
      '<p class="mt-1 max-w-[240px] text-sm text-muted-foreground">Link a memory.</p>',
    );
    expect(attr(actions, "class")).toBe("mt-4");
  });

  it("adds a gap under the default title and renders it as a child element", async () => {
    const host = await mount(
      <EmptyState.Root>
        <EmptyState.Title asChild>
          <h3>Nothing here yet</h3>
        </EmptyState.Title>
      </EmptyState.Root>,
    );
    expect(first(host).innerHTML).toBe(
      '<h3 class="text-sm font-medium text-foreground mb-1">Nothing here yet</h3>',
    );
  });

  it("overrides icon size, stroke and outer classes", async () => {
    const host = await mount(
      <EmptyState.Root variant="panel">
        <EmptyState.Icon icon={IconLink} size={28} stroke={2} className="mb-4 h-14 w-14" />
      </EmptyState.Root>,
    );
    const tile = first(host).firstElementChild;
    expect(attr(tile, "class")).toBe("flex items-center justify-center rounded-lg bg-surface-tertiary mb-4 h-14 w-14");
    expect(attr(tile?.firstElementChild, "width")).toBe("28");
    expect(attr(tile?.firstElementChild, "stroke-width")).toBe("2");
  });
});
