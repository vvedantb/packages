import { describe, expect, it } from "vitest";
import { skipConfirmTitle } from "../src/confirm/ConfirmSkipHint.js";

describe("skipConfirmTitle", () => {
  it("names the Alt-click skip, with an optional action label", () => {
    expect(skipConfirmTitle()).toMatch(/-click skips confirmation$/);
    expect(skipConfirmTitle("Delete")).toMatch(
      /^Delete · .+click skips confirmation$/,
    );
  });
});
