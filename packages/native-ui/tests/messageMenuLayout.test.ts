import { describe, expect, it } from "vitest";
import { MESSAGE_MENU, messageContextMenuLayout } from "../src/ai/message-menu-layout";

// The hold menu keeps the held message where it was, but moves it (or shows
// its top part) so the reaction pill and the action card stay on screen.
const window = { width: 390, height: 844 };
const insets = { top: 47, bottom: 34 };

describe("messageContextMenuLayout", () => {
  it("leaves a message in the middle of the screen where it was held", () => {
    const layout = messageContextMenuLayout({ anchor: { x: 16, y: 300, width: 300, height: 80 }, window, insets, menuHeight: 192, hasReactions: true });
    expect(layout.previewTop).toBe(300);
    expect(layout.pillTop).toBe(300 - MESSAGE_MENU.pillHeight - MESSAGE_MENU.gap);
    expect(layout.menuTop).toBe(300 + 80 + MESSAGE_MENU.gap);
  });

  it("moves a message near the bottom up until the card fits", () => {
    const layout = messageContextMenuLayout({ anchor: { x: 16, y: 700, width: 300, height: 80 }, window, insets, menuHeight: 192, hasReactions: true });
    expect(layout.menuTop + 192).toBe(window.height - insets.bottom - MESSAGE_MENU.edge);
  });

  it("moves a message near the top down until the pill fits", () => {
    const layout = messageContextMenuLayout({ anchor: { x: 16, y: 20, width: 300, height: 80 }, window, insets, menuHeight: 192, hasReactions: true });
    expect(layout.pillTop).toBe(insets.top + MESSAGE_MENU.edge);
  });

  it("shows the top part of a message taller than the room", () => {
    const layout = messageContextMenuLayout({ anchor: { x: 16, y: 100, width: 300, height: 2000 }, window, insets, menuHeight: 192, hasReactions: true });
    expect(layout.previewHeight).toBeLessThanOrEqual(window.height * MESSAGE_MENU.maxPreviewRatio);
    expect(layout.menuTop + 192).toBeLessThanOrEqual(window.height - insets.bottom - MESSAGE_MENU.edge);
  });
});
