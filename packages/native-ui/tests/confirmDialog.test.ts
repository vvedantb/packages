import { describe, expect, it, vi } from "vitest";

// `ConfirmDialog` closes on Cancel, Android back and the VoiceOver escape
// through the dialog's `onOpenChange`; each of those calls `onCancel`, and
// Confirm does not. The dialog parts are stubbed; the checks call
// `ConfirmDialog` and the handlers in the tree it returns.

const impact = vi.hoisted(() => vi.fn());

vi.mock("../src/AlertDialog", () => ({
  AlertDialog: "AlertDialog",
  AlertDialogAction: "AlertDialogAction",
  AlertDialogCancel: "AlertDialogCancel",
  AlertDialogContent: "AlertDialogContent",
  AlertDialogDescription: "AlertDialogDescription",
  AlertDialogFooter: "AlertDialogFooter",
  AlertDialogHeader: "AlertDialogHeader",
  AlertDialogTitle: "AlertDialogTitle",
}));
vi.mock("../src/haptics", () => ({ impactHaptic: impact }));
// A controlled value: the parent's `open`, and `onChange` on each set.
vi.mock("../src/primitives/use-controllable-state", () => ({
  useControllableState: <T>({ value, onChange }: { value: T; onChange?: (next: T) => void }) =>
    [value, (next: T) => onChange?.(next)] as const,
}));

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}

async function dialog(variant: "default" | "destructive" = "default") {
  const { ConfirmDialog } = await import("../src/ConfirmDialog");
  const handlers = { onOpenChange: vi.fn(), onCancel: vi.fn(), onConfirm: vi.fn() };
  const tree = ConfirmDialog({ open: true, title: "Delete draft?", variant, ...handlers }) as unknown as Element;
  const part = (type: string) => elements(tree).find((element) => element.type === type);
  return { tree, part, ...handlers };
}

describe("ConfirmDialog", () => {
  it("calls onCancel on every close that is not Confirm: back, the escape gesture, Cancel", async () => {
    const { tree, part, onOpenChange, onCancel, onConfirm } = await dialog();
    expect(tree.type).toBe("AlertDialog");
    // The overlay's own close (back, escape, and Cancel's press) is `onOpenChange(false)`.
    (tree.props.onOpenChange as (open: boolean) => void)(false);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
    // Cancel has no handler of its own, so it does not call `onCancel` twice.
    expect(part("AlertDialogCancel")!.props.onPress).toBeUndefined();
  });

  it("does not call onCancel when it opens", async () => {
    const { tree, onCancel, onOpenChange } = await dialog();
    (tree.props.onOpenChange as (open: boolean) => void)(true);
    expect(onCancel).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("confirms and closes without calling onCancel, with a haptic when destructive", async () => {
    const { part, onOpenChange, onCancel, onConfirm } = await dialog("destructive");
    (part("AlertDialogAction")!.props.onPress as () => void)();
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCancel).not.toHaveBeenCalled();
    expect(impact).toHaveBeenCalledWith("medium");
  });
});
