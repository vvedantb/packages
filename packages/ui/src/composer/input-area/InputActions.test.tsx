import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { InputActions } from "./InputActions";

// `InputActions` has no hooks, so calling it returns the menu element tree.
function contentProps(props: Parameters<typeof InputActions>[0] = {}) {
  const root = InputActions(props) as ReactElement<{ children: ReactElement[] }>;
  return (root.props.children[1] as ReactElement).props as Record<string, unknown>;
}

describe("InputActions menu content", () => {
  it("defaults to the original adapter placement", () => {
    const p = contentProps();
    expect(p.align).toBe("start");
    expect(p.side).toBe("top");
    expect(p.collisionPadding).toBe(12);
  });

  it("lets menuContentProps override defaults", () => {
    const p = contentProps({ menuContentProps: { align: "end", sideOffset: 8 } });
    expect(p.align).toBe("end");
    expect(p.sideOffset).toBe(8);
    expect(p.side).toBe("top");
  });
});
