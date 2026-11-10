import { describe, expect, it } from "vitest";
import { withAlpha } from "../src/palette";

describe("palette", () => {
  it("withAlpha turns #rrggbb into rgba()", () => {
    expect(withAlpha("#ff373c", 0.12)).toBe("rgba(255, 55, 60, 0.12)");
    expect(withAlpha("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
  });
});
