import { Children, createElement, isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { tokens } from "../src/tokens";
import type { SurfaceRowProps } from "../src/SurfaceRow";

// `SurfaceRow` (`/primitives` and root): the web `ListRow` shell, a card
// surface with a status stripe, pressed as one button.

vi.mock("react-native", () => ({ Pressable: "Pressable", View: "View" }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));

type Part = {
  style?: Record<string, string | number | undefined>;
  children?: ReactNode;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityActions?: Array<{ name: string; label?: string }>;
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
};

function part(node: ReactNode) {
  if (!isValidElement<Part>(node)) throw new Error("not an element");
  return node;
}

async function render(props: Partial<SurfaceRowProps>) {
  const { SurfaceRow } = await import("../src/SurfaceRow");
  const tree = part(SurfaceRow({ accessibilityLabel: "Fix login", onPress: () => {}, children: createElement("Body"), ...props }));
  const parts = Children.toArray(part(tree.props.children).props.children).map(part);
  return { tree, parts };
}

describe("SurfaceRow", () => {
  it("is one named button on the card surface with the surface radius", async () => {
    const onPress = vi.fn();
    const { tree } = await render({ onPress, accessibilityHint: "To Do" });
    expect(tree.type).toBe("Pressable");
    expect(tree.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "Fix login", accessibilityHint: "To Do" });
    expect(tree.props.style).toMatchObject({ backgroundColor: tokens.color.surface.light, borderRadius: 16, borderWidth: 0 });
    tree.props.onPress?.();
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("draws a 4 wide stripe in the accent colour, 8 in from top and bottom, before the body", async () => {
    const { parts } = await render({ accentColor: "#facc15" });
    expect(parts).toHaveLength(2);
    expect(parts[0]?.props.style).toMatchObject({ top: 8, bottom: 8, width: 4, backgroundColor: "#facc15" });
    expect(part(parts[1]?.props.children).type).toBe("Body");
  });

  it("has no stripe without an accent, and a 1 wide hairline with a border colour", async () => {
    const { tree, parts } = await render({ borderColor: "#ff0000", backgroundColor: "#fff5f5" });
    expect(parts).toHaveLength(1);
    expect(tree.props.style).toMatchObject({ backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#ff0000" });
  });

  it("opens its menu on a long press, and offers it to VoiceOver and TalkBack as a named action", async () => {
    const onLongPress = vi.fn();
    const { tree } = await render({ onLongPress, longPressLabel: "Task actions" });
    expect(tree.props.accessibilityActions).toEqual([{ name: "longpress", label: "Task actions" }]);
    tree.props.onLongPress?.();
    tree.props.onAccessibilityAction?.({ nativeEvent: { actionName: "longpress" } });
    expect(onLongPress).toHaveBeenCalledTimes(2);
  });

  it("has no long-press action without a handler", async () => {
    const { tree } = await render({});
    expect(tree.props.accessibilityActions).toBeUndefined();
  });
});
