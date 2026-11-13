import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

// `SelectContent` draws through `SelectHost`: a transparent Modal on Android (as
// `DropdownMenuContent`), so options paint and take taps above tab bars and glass.
// React Native and the primitive are stubbed; the checks read the element tree.

const state = vi.hoisted(() => ({ os: "android" }));
const motion = vi.hoisted(() => ({ reduce: false }));
const ctx = vi.hoisted(() => ({
  open: true,
  onOpenChange: vi.fn(),
  setTriggerPosition: vi.fn(),
  setContentLayout: vi.fn(),
}));

vi.mock("react-native", () => ({
  Modal: "Modal",
  View: "View",
  Platform: {
    get OS() {
      return state.os;
    },
  },
}));
vi.mock("react-native-screens", () => ({ FullWindowOverlay: "FullWindowOverlay" }));
vi.mock("@rn-primitives/select", () => ({ useRootContext: () => ctx }));
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => motion.reduce }));

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

afterEach(() => {
  state.os = "android";
  ctx.open = true;
  motion.reduce = false;
  vi.clearAllMocks();
});

describe("SelectHost", () => {
  it("on Android is a transparent Modal with a full-size box-none host", async () => {
    const { SelectHost } = await import("../src/primitives/select-host");
    const modal = SelectHost({ children: "options" }) as unknown as Element;
    expect(modal.type).toBe("Modal");
    expect(modal.props).toMatchObject({
      visible: true,
      transparent: true,
      statusBarTranslucent: true,
      animationType: "fade",
    });
    const host = modal.props.children as Element;
    expect(host.type).toBe("View");
    expect(host.props.style).toEqual({ flex: 1 });
    expect(host.props.pointerEvents).toBe("box-none");
    expect(host.props.children).toBe("options");
  });

  it("on Android turns the Modal animation off with reduce motion", async () => {
    const { SelectHost } = await import("../src/primitives/select-host");
    motion.reduce = true;
    const modal = SelectHost({ children: "options" }) as unknown as Element;
    expect(modal.props.animationType).toBe("none");
  });

  it("on Android mounts no Modal while closed", async () => {
    const { SelectHost } = await import("../src/primitives/select-host");
    ctx.open = false;
    expect(SelectHost({ children: "options" })).toBeNull();
  });

  it("closes the Select on Android back", async () => {
    const { SelectHost } = await import("../src/primitives/select-host");
    const modal = SelectHost({ children: null }) as unknown as Element;
    (modal.props.onRequestClose as () => void)();
    expect(ctx.setTriggerPosition).toHaveBeenCalledWith(null);
    expect(ctx.setContentLayout).toHaveBeenCalledWith(null);
    expect(ctx.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps FullWindowOverlay on iOS and no wrapper on web", async () => {
    const { SelectHost } = await import("../src/primitives/select-host");
    state.os = "ios";
    expect((SelectHost({ children: "x" }) as unknown as Element).type).toBe("FullWindowOverlay");
    state.os = "web";
    const web = SelectHost({ children: "x" }) as unknown as Element;
    expect(web.props.children).toBe("x");
    expect(web.type).not.toBe("Modal");
  });

  it("SelectContent uses the host, not a bare portal child", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const source = readFileSync(join(root, "src/primitives/select.tsx"), "utf8");
    expect(source).toContain("<SelectHost>");
    expect(source).not.toContain("FullWindowOverlay");
    // Android renders the host directly: no Portal around the Modal.
    expect(source).toMatch(/Platform\.OS === "android"\) \{\s*return <SelectHost>/);
  });
});
