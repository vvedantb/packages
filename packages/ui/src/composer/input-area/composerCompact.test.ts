import { describe, expect, it } from "vitest";
import { isComposerCompact } from "./composerCompact";

describe("isComposerCompact", () => {
  it("stays expanded while skill chips are present", () => {
    expect(
      isComposerCompact({
        value: "",
        fileCount: 0,
        chipCount: 1,
        exceedsPill: false,
      }),
    ).toBe(false);
  });

  it("compacts an empty draft with no files or chips", () => {
    expect(
      isComposerCompact({
        value: "",
        fileCount: 0,
        chipCount: 0,
        exceedsPill: false,
      }),
    ).toBe(true);
  });
});
