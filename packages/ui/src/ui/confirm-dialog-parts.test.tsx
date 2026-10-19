// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
}

async function rerender(node: ReactNode) {
  await act(async () => root?.render(node));
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

function button(text: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === text);
  if (!found) throw new Error(`missing button ${text}`);
  return found;
}

function input(): HTMLInputElement {
  const el = document.querySelector("input");
  if (!el) throw new Error("missing input");
  return el;
}

async function type(value: string) {
  const el = input();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function key(target: Element, name: string) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
  });
}

function dialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  confirmPhrase?: string;
  onEnter?: () => void;
  alert?: boolean;
}) {
  const { onEnter, ...rootProps } = props;
  return (
    <ConfirmDialog.Root {...rootProps}>
      <ConfirmDialog.Content>
        <ConfirmDialog.Header>
          <ConfirmDialog.Title>Delete project?</ConfirmDialog.Title>
          <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
        </ConfirmDialog.Header>
        {props.confirmPhrase ? <ConfirmDialog.Field onEnter={onEnter} /> : null}
        <ConfirmDialog.Footer>
          <ConfirmDialog.Cancel />
          <ConfirmDialog.Action variant="destructive" pendingLabel="Deleting...">
            Delete
          </ConfirmDialog.Action>
        </ConfirmDialog.Footer>
      </ConfirmDialog.Content>
    </ConfirmDialog.Root>
  );
}

describe("ConfirmDialog parts: pending", () => {
  it("swallows Escape, disables Cancel and shows the pending label with a spinner", async () => {
    const onOpenChange = vi.fn();
    await mount(dialog({ open: true, onOpenChange, pending: true }));
    const content = document.querySelector('[role="alertdialog"]');
    if (!content) throw new Error("missing dialog");
    await key(content, "Escape");
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();

    expect(button("Cancel").disabled).toBe(true);
    const action = button("Deleting...");
    expect(action.disabled).toBe(true);
    expect(action.querySelector("svg.animate-spin")).not.toBeNull();
  });

  it("closes on Escape once not pending", async () => {
    const onOpenChange = vi.fn();
    await mount(dialog({ open: true, onOpenChange }));
    const content = document.querySelector('[role="alertdialog"]');
    if (!content) throw new Error("missing dialog");
    await key(content, "Escape");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(button("Delete").disabled).toBe(false);
  });
});

describe("ConfirmDialog parts: confirmPhrase", () => {
  it("gates Action on a trimmed, case-insensitive match", async () => {
    await mount(dialog({ open: true, onOpenChange: () => {}, confirmPhrase: "My Project" }));
    expect(document.querySelector("label")?.textContent).toBe("Type My Project to confirm");
    expect(input().placeholder).toBe("My Project");
    expect(button("Delete").disabled).toBe(true);
    await type("my proj");
    expect(button("Delete").disabled).toBe(true);
    await type("  my project ");
    expect(button("Delete").disabled).toBe(false);
  });

  it("resets the typed text when the dialog reopens", async () => {
    const onOpenChange = () => {};
    await mount(dialog({ open: true, onOpenChange, confirmPhrase: "delete" }));
    await type("delete");
    expect(button("Delete").disabled).toBe(false);
    await rerender(dialog({ open: false, onOpenChange, confirmPhrase: "delete" }));
    await rerender(dialog({ open: true, onOpenChange, confirmPhrase: "delete" }));
    expect(input().value).toBe("");
    expect(button("Delete").disabled).toBe(true);
  });

  it("calls onEnter on Enter only while the phrase matches", async () => {
    const onEnter = vi.fn();
    await mount(dialog({ open: true, onOpenChange: () => {}, confirmPhrase: "delete", onEnter }));
    await type("del");
    await key(input(), "Enter");
    expect(onEnter).not.toHaveBeenCalled();
    await type("DELETE");
    await key(input(), "Enter");
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDialog parts: alert={false}", () => {
  it("renders a ghost Cancel that closes through onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();
    const onClick = vi.fn();
    await mount(
      <ConfirmDialog.Root open onOpenChange={onOpenChange} alert={false}>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Rename</ConfirmDialog.Title>
          <ConfirmDialog.Footer>
            <ConfirmDialog.Cancel onClick={onClick} />
            <ConfirmDialog.Action>Save</ConfirmDialog.Action>
          </ConfirmDialog.Footer>
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const cancel = button("Cancel");
    expect(cancel.hasAttribute("data-alert-cancel")).toBe(false);
    expect(cancel.className).toContain("text-muted-foreground");

    await act(async () => button("Save").click());
    expect(onOpenChange).not.toHaveBeenCalled();

    await act(async () => cancel.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open when the Cancel onClick prevents default", async () => {
    const onOpenChange = vi.fn();
    await mount(
      <ConfirmDialog.Root open onOpenChange={onOpenChange} alert={false}>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Rename</ConfirmDialog.Title>
          <ConfirmDialog.Cancel onClick={(event) => event.preventDefault()} />
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>,
    );
    await act(async () => button("Cancel").click());
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("ConfirmDialog parts: Content", () => {
  it("passes role and className through", async () => {
    await mount(
      <ConfirmDialog.Root open alert={false}>
        <ConfirmDialog.Content role="alertdialog" className="content-x">
          <ConfirmDialog.Title>Heads up</ConfirmDialog.Title>
          <ConfirmDialog.Description>Read this.</ConfirmDialog.Description>
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>,
    );
    const content = document.querySelector('[role="alertdialog"]');
    expect(content?.className).toContain("content-x");
  });
});
