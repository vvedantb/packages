import { describe, expect, it } from "vitest";
import { optionId } from "./composerSlashOptionId";

describe("optionId", () => {
  it("joins the listbox id and the item id", () => {
    expect(optionId("list", "preview")).toBe("list-option-preview");
  });

  it("replaces characters that break id selectors", () => {
    expect(optionId(":r1:", "owner/repo")).toBe("-r1--option-owner-repo");
    expect(optionId("list", "skill:name")).toBe("list-option-skill-name");
  });
});
