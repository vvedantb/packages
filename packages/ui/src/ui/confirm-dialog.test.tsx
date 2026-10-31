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

describe('ConfirmDialog size="md"', () => {
  it("renders the sectioned layout and closes only on Cancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    await mount(
      <ConfirmDialog
        size="md"
        open
        onOpenChange={onOpenChange}
        title="Remove member?"
        description="They lose access now."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.className).toContain("sm:max-w-96");
    const title = document.querySelector("h2");
    expect(title?.textContent).toBe("Remove member?");
    expect(title?.parentElement?.className).toContain("pb-4");
    const description = document.querySelector("p.py-6");
    expect(description?.textContent).toBe("They lose access now.");
    expect(description?.className).toContain("py-6 text-muted-foreground");
    const footer = document.querySelector('[data-slot="dialog-footer"]');
    expect(footer?.className).toContain("pt-4");
    const buttons = Array.from(footer?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    expect(buttons.map((b) => b.textContent)).toEqual(["Cancel", "Remove"]);

    await act(async () => buttons[1]?.click());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    await act(async () => buttons[0]?.click());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("omits the description without one and disables confirm with confirmDisabled", async () => {
    await mount(<ConfirmDialog size="md" open title="Leave?" confirmDisabled />);
    expect(document.querySelector("p.py-6")).toBeNull();
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-footer"] button'),
    );
    expect(buttons.map((b) => b.disabled)).toEqual([false, true]);
  });
});

describe("ConfirmDialog pending and body", () => {
  it("renders body inside the dialog and spins the action while pending", async () => {
    const onOpenChange = vi.fn();
    await mount(
      <ConfirmDialog
        size="md"
        open
        onOpenChange={onOpenChange}
        title="Delete task?"
        confirmLabel="Delete"
        pending
        body={<p data-testid="detail">Files go too.</p>}
      />,
    );
    expect(document.querySelector('[role="dialog"] [data-testid="detail"]')?.textContent).toBe(
      "Files go too.",
    );
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-footer"] button'),
    );
    expect(buttons.map((b) => b.disabled)).toEqual([true, true]);
    expect(buttons[1]?.textContent).toBe("Delete");
    expect(buttons[1]?.querySelector(".animate-spin")).not.toBeNull();
    await act(async () => buttons[0]?.click());
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog size="default"', () => {
  it("still renders the blocking alert dialog", async () => {
    await mount(<ConfirmDialog open title="Discard?" description="Changes are lost." />);
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector("[data-alert-cancel]")?.textContent).toBe("Cancel");
  });
});
