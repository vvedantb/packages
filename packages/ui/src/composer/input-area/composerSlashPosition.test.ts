import { describe, expect, it } from "vitest";
import { computePanelPopupPlacement } from "./composerSlashPosition";

function box(
  top: number,
  left: number,
  width: number,
  height: number,
): DOMRect {
  return {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
    x: left,
    y: top,
    toJSON() {
      return {};
    },
  };
}

describe("computePanelPopupPlacement", () => {
  it("anchors a full-width sheet above the composer when there is room", () => {
    const placement = computePanelPopupPlacement(box(400, 40, 640, 80), {
      width: 800,
      height: 800,
    });
    expect(placement.placement).toBe("above");
    expect(placement.left).toBe(40);
    expect(placement.width).toBe(640);
    expect(placement.top).toBe(394);
  });

  it("flips below when the space above is tight", () => {
    const placement = computePanelPopupPlacement(box(40, 16, 360, 64), {
      width: 400,
      height: 800,
    });
    expect(placement.placement).toBe("below");
    expect(placement.top).toBe(110);
  });
});
