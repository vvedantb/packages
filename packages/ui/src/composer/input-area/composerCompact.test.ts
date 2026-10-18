import { describe, expect, it } from "vitest";
import { isComposerCompact } from "./composerCompact";

describe("isComposerCompact", () => {
  it("stays compact for an empty draft whatever the chips", () => {
    expect(
      isComposerCompact({
        value: "",
        fileCount: 0,
        exceedsPill: false,
      }),
    ).toBe(true);
  });

  it("stays compact for short text", () => {
    expect(
      isComposerCompact({ value: "hello", fileCount: 0, exceedsPill: false }),
    ).toBe(true);
  });

  it("expands on files, newlines and a wrapped line", () => {
    expect(
      isComposerCompact({ value: "", fileCount: 1, exceedsPill: false }),
    ).toBe(false);
    expect(
      isComposerCompact({ value: "a\nb", fileCount: 0, exceedsPill: false }),
    ).toBe(false);
    expect(
      isComposerCompact({ value: "long", fileCount: 0, exceedsPill: true }),
    ).toBe(false);
  });
});
