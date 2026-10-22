// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./dialog";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

describe("DialogFooter", () => {
  it("has no fill of its own, so it shows the content's surface", async () => {
    await mount(
      <Dialog open>
        <DialogContent className="bg-surface-secondary" aria-describedby={undefined}>
          <DialogTitle>New task</DialogTitle>
          <DialogFooter>Actions</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    const footer = document.querySelector('[data-slot="dialog-footer"]');
    if (!footer) throw new Error("missing footer");
    expect(footer.className.split(" ").filter((c) => c.startsWith("bg-"))).toEqual([]);
    expect(footer.closest('[role="dialog"]')?.className).toContain("bg-surface-secondary");
  });
});
