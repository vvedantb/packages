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

function footer(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="dialog-footer"]');
  if (!el) throw new Error("missing footer");
  return el;
}

function content(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
  if (!el) throw new Error("missing dialog");
  return el;
}

function rowDialog(props: { row?: boolean; size?: "default" | "sm" | "md" }) {
  return (
    <ConfirmDialog.Root open size={props.size}>
      <ConfirmDialog.Content>
        <ConfirmDialog.Title>Delete project?</ConfirmDialog.Title>
        <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
        <ConfirmDialog.Footer row={props.row}>
          <ConfirmDialog.Cancel />
          <ConfirmDialog.Action>Delete</ConfirmDialog.Action>
        </ConfirmDialog.Footer>
      </ConfirmDialog.Content>
    </ConfirmDialog.Root>
  );
}

describe("ConfirmDialog parts: Footer row", () => {
  it("adds a forced right-aligned row and keeps the footer slot and classes", async () => {
    await mount(rowDialog({ row: true }));
    const el = footer();
    expect(el.className).toContain("justify-end");
    expect(el.className).toContain("flex-row!");
    for (const cls of ["mt-auto", "pt-2", "gap-2", "[&_button]:max-sm:min-h-11", "pb-[max(0px,env(safe-area-inset-bottom,0px))]"]) {
      expect(el.className).toContain(cls);
    }
    expect(el.hasAttribute("row")).toBe(false);
  });

  it("keeps the row in the compact sheet", async () => {
    const matching = window.matchMedia("(min-width: 0px)");
    const spy = vi.spyOn(window, "matchMedia").mockImplementation(() => matching);
    try {
      await mount(rowDialog({ row: true, size: "md" }));
      expect(content().getAttribute("data-compact")).toBe("true");
      expect(footer().className).toContain("flex-row!");
      expect(footer().className).toContain("pt-4");
    } finally {
      spy.mockRestore();
    }
  });

  it("is unchanged without row, and a no-op for size sm", async () => {
    await mount(rowDialog({}));
    const plain = footer().className;
    expect(plain).not.toContain("flex-row!");
    await rerender(rowDialog({ row: false }));
    expect(footer().className).toBe(plain);

    await rerender(rowDialog({ size: "sm" }));
    const smFooter = button("Delete").parentElement;
    const smClass = smFooter?.className;
    expect(smClass).toBe("flex justify-end gap-2");
    await rerender(rowDialog({ size: "sm", row: true }));
    expect(button("Delete").parentElement?.className).toBe(smClass);
  });
});

function focusDialog(props: { focusCancel?: boolean; cancelAttr?: boolean }) {
  return (
    <ConfirmDialog.Root open alert={false} focusCancel={props.focusCancel}>
      <ConfirmDialog.Content role="alertdialog">
        <ConfirmDialog.Title>Discard changes?</ConfirmDialog.Title>
        <ConfirmDialog.Description>Unsaved edits are lost.</ConfirmDialog.Description>
        <ConfirmDialog.Footer>
          {props.cancelAttr === undefined ? (
            <ConfirmDialog.Cancel />
          ) : (
            <ConfirmDialog.Cancel data-alert-cancel={props.cancelAttr ? "" : undefined} />
          )}
          <ConfirmDialog.Action>Discard</ConfirmDialog.Action>
        </ConfirmDialog.Footer>
      </ConfirmDialog.Content>
    </ConfirmDialog.Root>
  );
}

describe("ConfirmDialog parts: focusCancel", () => {
  it("marks and focuses Cancel on open in a dismissible alertdialog", async () => {
    await mount(focusDialog({ focusCancel: true }));
    expect(button("Cancel").getAttribute("data-alert-cancel")).toBe("");
    expect(document.activeElement).toBe(button("Cancel"));
  });

  it("does not mark Cancel by default", async () => {
    await mount(focusDialog({}));
    expect(button("Cancel").hasAttribute("data-alert-cancel")).toBe(false);
    expect(document.activeElement).not.toBe(button("Cancel"));
  });

  it("lets an explicit data-alert-cancel win", async () => {
    await mount(focusDialog({ focusCancel: true, cancelAttr: false }));
    expect(button("Cancel").hasAttribute("data-alert-cancel")).toBe(false);
  });

  it("is a no-op for alert", async () => {
    await mount(dialog({ open: true, onOpenChange: () => {} }));
    const before = button("Cancel").outerHTML;
    await rerender(
      <ConfirmDialog.Root open onOpenChange={() => {}} focusCancel>
        <ConfirmDialog.Content>
          <ConfirmDialog.Header>
            <ConfirmDialog.Title>Delete project?</ConfirmDialog.Title>
            <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
          </ConfirmDialog.Header>
          <ConfirmDialog.Footer>
            <ConfirmDialog.Cancel />
          </ConfirmDialog.Footer>
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>,
    );
    expect(button("Cancel").outerHTML).toBe(before);
  });
});

describe("ConfirmDialog parts: dismissibleWhilePending", () => {
  function pendingDialog(onOpenChange: (open: boolean) => void, alert: boolean) {
    return (
      <ConfirmDialog.Root open onOpenChange={onOpenChange} alert={alert} pending dismissibleWhilePending>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Delete project?</ConfirmDialog.Title>
          <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
          <ConfirmDialog.Footer>
            <ConfirmDialog.Cancel />
            <ConfirmDialog.Action pendingLabel="Deleting...">Delete</ConfirmDialog.Action>
          </ConfirmDialog.Footer>
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>
    );
  }

  it("closes on Escape while Cancel stays disabled and Action pending", async () => {
    const onOpenChange = vi.fn();
    await mount(pendingDialog(onOpenChange, true));
    expect(button("Cancel").disabled).toBe(true);
    expect(button("Deleting...").disabled).toBe(true);
    expect(button("Deleting...").querySelector("svg.animate-spin")).not.toBeNull();
    await key(content(), "Escape");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes through the close button in a dismissible dialog", async () => {
    const onOpenChange = vi.fn();
    await mount(pendingDialog(onOpenChange, false));
    expect(button("Cancel").disabled).toBe(true);
    await act(async () => button("Close").click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("ConfirmDialog parts: Action spinnerClassName", () => {
  it("merges after animate-spin and keeps the default otherwise", async () => {
    const view = (spinnerClassName?: string) => (
      <ConfirmDialog.Root open>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Delete</ConfirmDialog.Title>
          <ConfirmDialog.Description>Gone for good.</ConfirmDialog.Description>
          <ConfirmDialog.Action pending pendingLabel="Delete" spinnerSize={16} spinnerClassName={spinnerClassName}>
            Delete
          </ConfirmDialog.Action>
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>
    );
    await mount(view());
    expect(button("Delete").querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
    expect(button("Delete").querySelector("svg")?.getAttribute("class")).not.toContain("mr-2");
    await rerender(view("mr-2"));
    const svg = button("Delete").querySelector("svg");
    expect(svg?.getAttribute("class")).toMatch(/animate-spin mr-2$/);
    expect(svg?.getAttribute("width")).toBe("16");
  });
});

describe("ConfirmDialog parts: supported patterns", () => {
  it("(a) pending on Action alone does not block close", async () => {
    const onOpenChange = vi.fn();
    await mount(
      <ConfirmDialog.Root open onOpenChange={onOpenChange}>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Delete project?</ConfirmDialog.Title>
          <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
          <ConfirmDialog.Cancel />
          <ConfirmDialog.Action pending pendingLabel="Deleting...">Delete</ConfirmDialog.Action>
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>,
    );
    expect(button("Deleting...").disabled).toBe(true);
    expect(button("Cancel").disabled).toBe(false);
    await key(content(), "Escape");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    await act(async () => button("Cancel").click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("(b) Cancel variant overrides the default", async () => {
    const view = (alert: boolean) => (
      <ConfirmDialog.Root open alert={alert}>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Delete</ConfirmDialog.Title>
          <ConfirmDialog.Description>Gone for good.</ConfirmDialog.Description>
          <ConfirmDialog.Cancel variant="outline">Plain</ConfirmDialog.Cancel>
          <ConfirmDialog.Cancel variant="secondary">Second</ConfirmDialog.Cancel>
          <ConfirmDialog.Cancel>Ghost</ConfirmDialog.Cancel>
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>
    );
    await mount(view(false));
    const ghost = button("Ghost").className;
    expect(button("Plain").className).not.toBe(ghost);
    expect(button("Second").className).not.toBe(ghost);
    expect(button("Second").className).not.toBe(button("Plain").className);
    await rerender(view(true));
    expect(button("Second").className).not.toBe(button("Ghost").className);
  });

  it("(c) Cancel preventDefault skips onOpenChange(false) in alert mode too", async () => {
    const onOpenChange = vi.fn();
    await mount(
      <ConfirmDialog.Root open onOpenChange={onOpenChange}>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Delete</ConfirmDialog.Title>
          <ConfirmDialog.Description>Gone for good.</ConfirmDialog.Description>
          <ConfirmDialog.Cancel onClick={(event) => event.preventDefault()} />
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>,
    );
    await act(async () => button("Cancel").click());
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("(d) parts inside a child component read the Root context", async () => {
    const onOpenChange = vi.fn();
    function Actions() {
      return (
        <form onSubmit={(event) => event.preventDefault()}>
          <ConfirmDialog.Footer row>
            <ConfirmDialog.Cancel />
            <ConfirmDialog.Action type="submit" pendingLabel="Saving...">Save</ConfirmDialog.Action>
          </ConfirmDialog.Footer>
        </form>
      );
    }
    await mount(
      <ConfirmDialog.Root open onOpenChange={onOpenChange} alert={false} pending>
        <ConfirmDialog.Content>
          <ConfirmDialog.Title>Rename</ConfirmDialog.Title>
          <Actions />
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>,
    );
    expect(button("Cancel").disabled).toBe(true);
    expect(button("Cancel").className).toContain("text-muted-foreground");
    expect(button("Saving...").disabled).toBe(true);
    expect(footer().className).toContain("flex-row!");
  });

  it("(e) swaps footers and Content role inside one Root", async () => {
    const view = (step: "confirm" | "done") => (
      <ConfirmDialog.Root open alert={false}>
        <ConfirmDialog.Content role={step === "confirm" ? "alertdialog" : undefined}>
          <ConfirmDialog.Title>Export</ConfirmDialog.Title>
          <ConfirmDialog.Description>Export the data.</ConfirmDialog.Description>
          {step === "confirm" ? (
            <ConfirmDialog.Footer>
              <ConfirmDialog.Cancel />
              <ConfirmDialog.Action>Export</ConfirmDialog.Action>
            </ConfirmDialog.Footer>
          ) : (
            <ConfirmDialog.Footer row>
              <ConfirmDialog.Cancel>Done</ConfirmDialog.Cancel>
            </ConfirmDialog.Footer>
          )}
        </ConfirmDialog.Content>
      </ConfirmDialog.Root>
    );
    await mount(view("confirm"));
    expect(content().getAttribute("role")).toBe("alertdialog");
    expect(button("Export")).not.toBeNull();
    await rerender(view("done"));
    expect(content().getAttribute("role")).toBe("dialog");
    expect(document.querySelectorAll('[data-slot="dialog-footer"]')).toHaveLength(1);
    expect(footer().contains(button("Done"))).toBe(true);
    expect(Array.from(document.querySelectorAll("button")).some((b) => b.textContent === "Export")).toBe(false);
  });
});
