// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Switch } from "./switch";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

async function render(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return host;
}

function parts(host: HTMLElement) {
  const control = host.querySelector('[role="switch"]');
  const thumb = control?.firstElementChild;
  if (!(control instanceof HTMLElement) || !(thumb instanceof HTMLElement)) throw new Error("no switch or thumb");
  return { control, thumb };
}

const DARK_UNCHECKED_TRACK = ["dark:data-[state=unchecked]:bg-muted/40", "dark:data-[state=unchecked]:border-muted/60"];
const DARK_UNCHECKED_THUMB = "dark:data-[state=unchecked]:bg-foreground";

describe("Switch", () => {
  it("keeps the light and checked classes and adds dark-only unchecked contrast", async () => {
    const host = await render(<Switch aria-label="Notifications" />);
    const { control, thumb } = parts(host);
    expect(control.getAttribute("data-state")).toBe("unchecked");
    for (const c of ["bg-default", "border-border", "data-[state=unchecked]:bg-default"]) {
      expect(control.classList).toContain(c);
    }
    for (const c of ["data-[state=checked]:bg-primary", "data-[state=checked]:border-primary"]) {
      expect(control.classList).toContain(c);
    }
    for (const c of DARK_UNCHECKED_TRACK) expect(control.classList).toContain(c);
    expect(thumb.classList).toContain("bg-background");
    expect(thumb.classList).toContain("data-[state=checked]:bg-primary-foreground");
    expect(thumb.classList).toContain(DARK_UNCHECKED_THUMB);
  });

  it("scopes the dark classes to the unchecked state", async () => {
    const host = await render(<Switch defaultChecked aria-label="Notifications" />);
    const { control, thumb } = parts(host);
    expect(control.getAttribute("data-state")).toBe("checked");
    expect(thumb.getAttribute("data-state")).toBe("checked");
    const dark = [...control.classList, ...thumb.classList].filter((c) => c.startsWith("dark:"));
    expect(dark.every((c) => c.startsWith("dark:data-[state=unchecked]:"))).toBe(true);
  });

  it("merges a caller className after the defaults", async () => {
    const host = await render(<Switch className="bg-border" aria-label="Notifications" />);
    const { control } = parts(host);
    expect(control.classList).toContain("bg-border");
    expect(control.classList).not.toContain("bg-default");
    for (const c of DARK_UNCHECKED_TRACK) expect(control.classList).toContain(c);
  });
});
