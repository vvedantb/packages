import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { tokens } from "../src/tokens";

// `DividedList` (`/primitives` and root): flat rows with a hairline between
// each pair, as the web `divide-y divide-border` lists.

vi.mock("react-native", () => ({ View: "View" }));
// Parts run as plain functions here, outside a renderer: `useScheme` reads the
// theme version context (`ThemeVersionContext`), so `useContext` gives its default, 0.
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), useContext: () => 0 }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));

type Element = { type: unknown; props: { style?: { height?: number; marginLeft?: number; backgroundColor?: string }; children?: unknown } };

async function render(children: unknown[], inset?: number) {
  const { DividedList } = await import("../src/DividedList");
  const tree = DividedList({ children, inset } as never) as unknown as Element;
  const fragments = tree.props.children as Element[];
  return fragments.flatMap((fragment) => (fragment.props.children as unknown[]).filter(Boolean) as Element[]);
}

/** Calls a `ListDivider` element, as React would. */
async function divider(element: Element | undefined) {
  const { ListDivider } = await import("../src/DividedList");
  expect(element?.type).toBe(ListDivider);
  return ListDivider(element?.props as never) as unknown as Element;
}

describe("DividedList", () => {
  it("puts a 1-high border-colour divider between rows, none before the first or after the last", async () => {
    const parts = await render([createElement("Row", { key: "a" }), createElement("Row", { key: "b" }), createElement("Row", { key: "c" })]);
    expect(parts.map((part) => (typeof part.type === "string" ? part.type : "divider"))).toEqual(["Row", "divider", "Row", "divider", "Row"]);
    const line = await divider(parts[1]);
    expect(line.type).toBe("View");
    expect(line.props.style).toEqual({ height: 1, marginLeft: 0, backgroundColor: tokens.color.border.light });
  });

  it("skips null rows and insets dividers", async () => {
    const parts = await render([createElement("Row", { key: "a" }), null, createElement("Row", { key: "b" })], 56);
    expect(parts.map((part) => (typeof part.type === "string" ? part.type : "divider"))).toEqual(["Row", "divider", "Row"]);
    expect((await divider(parts[1])).props.style?.marginLeft).toBe(56);
  });
});
