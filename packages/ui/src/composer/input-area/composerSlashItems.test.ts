import { describe, expect, it } from "vitest";
import { MAIN_CHAT_ACTION_FEATURES } from "./inputPresets";
import {
  buildComposerSlashItems,
  filterAndGroupSlashItems,
} from "./composerSlashItems";
import { DEFAULT_BANNER_FEATURES } from "./types";

const emptyFeatures = {
  ...DEFAULT_BANNER_FEATURES,
};

describe("buildComposerSlashItems", () => {
  it("includes composer actions, installed and hub skills", () => {
    const items = buildComposerSlashItems({
      actionFeatures: MAIN_CHAT_ACTION_FEATURES,
      bannerFeatures: emptyFeatures,
      showFileUpload: true,
      includeNewChat: true,
      hubSkills: [
        {
          _id: "hub1",
          name: "Capture",
          description: "Save notes",
          slug: "capture",
          installed: true,
          enabled: true,
        },
        {
          _id: "hub2",
          name: "Hidden",
          description: "Not installed",
          slug: "hidden",
          installed: false,
          enabled: false,
        },
      ],
      manualSkills: [
        {
          _id: "man1",
          name: "draft",
          description: "Draft helper",
          activation: "manual",
        },
      ],
      selectedManualIds: ["man1"],
    });

    expect(items.some((item) => item.id === "action:new-chat")).toBe(true);
    expect(items.some((item) => item.id === "action:attach")).toBe(true);
    for (const removed of [
      "webSearch",
      "deepWebSearch",
      "imageGen",
      "deepThink",
    ]) {
      expect(items.some((item) => item.id === `action:${removed}`)).toBe(false);
    }
    for (const removed of ["alpha", "beta"]) {
      expect(items.some((item) => item.id === `action:${removed}`)).toBe(false);
    }
    expect(items.some((item) => item.id === "action:artifacts")).toBe(true);
    expect(items.some((item) => item.id === "action:new-artifact")).toBe(true);
    expect(items.some((item) => item.id === "skill-hub:hub1")).toBe(true);
    expect(items.some((item) => item.id === "skill-hub:hub2")).toBe(false);
    expect(items.some((item) => item.id === "skill-manual:man1")).toBe(true);
    expect(items.some((item) => item.label.includes("preset"))).toBe(false);
  });

  it("omits attach and new chat when those surfaces are off", () => {
    const items = buildComposerSlashItems({
      actionFeatures: MAIN_CHAT_ACTION_FEATURES,
      bannerFeatures: emptyFeatures,
      showFileUpload: false,
      includeNewChat: false,
      hubSkills: [],
      manualSkills: [],
      selectedManualIds: [],
    });
    expect(items.some((item) => item.id === "action:attach")).toBe(false);
    expect(items.some((item) => item.id === "action:new-chat")).toBe(false);
    expect(items.some((item) => item.id === "action:privacy")).toBe(true);
    expect(items.some((item) => item.id === "action:memories")).toBe(false);
    expect(
      items.some((item) => item.kind === "action" && item.label === "memories"),
    ).toBe(false);
  });
});

describe("filterAndGroupSlashItems", () => {
  const items = buildComposerSlashItems({
    actionFeatures: MAIN_CHAT_ACTION_FEATURES,
    bannerFeatures: emptyFeatures,
    showFileUpload: true,
    includeNewChat: true,
    hubSkills: [],
    manualSkills: [],
    selectedManualIds: [],
  });

  it("keeps group order and hides empty groups", () => {
    const groups = filterAndGroupSlashItems(items, "attach");
    expect(groups.map((group) => group.group)).toEqual(["Actions"]);
  });

  it("filters actions by query", () => {
    const groups = filterAndGroupSlashItems(items, "attach");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items[0]?.id).toBe("action:attach");
  });
});
