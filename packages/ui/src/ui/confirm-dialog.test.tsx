// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('ConfirmDialog size="sm"', () => {
  it("renders title, description and both buttons", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    await mount(
      <ConfirmDialog
        size="sm"
        open
        onOpenChange={onOpenChange}
        title="Delete item?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const title = document.querySelector("h2");
    expect(title?.textContent).toBe("Delete item?");
    expect(title?.className).toContain("mb-2 text-sm font-medium");
    expect(document.body.textContent).toContain("This cannot be undone.");
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".flex.justify-end.gap-2 > button"));
    expect(buttons.map((b) => b.textContent)).toEqual(["Cancel", "Delete"]);

    await act(async () => buttons[1]?.click());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    await act(async () => buttons[0]?.click());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
