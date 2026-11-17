import type { ReactionRowItem } from "../ReactionRow";
import type { MessageSheetAction } from "./message-action-sheet";

/** A view's box in window coordinates, from `measureInWindow`. */
export type MessageMenuRect = { x: number; y: number; width: number; height: number };

/** What a held message offers: quick reactions above it, actions below it. */
export type MessageMenu = {
  reactions?: { items: readonly ReactionRowItem[]; onPress: (key: string) => void };
  actions: MessageSheetAction[];
};

/** The pill's height, the gap between the parts, the menu's width and the margin from the screen edges. */
export const MESSAGE_MENU = { pillHeight: 52, gap: 8, menuWidth: 250, edge: 12, maxPreviewRatio: 0.4 } as const;

/**
 * Where the parts go: the message stays where it was held when the pill fits
 * above it and the menu below it; else it moves just enough, and a message
 * taller than `maxPreviewRatio` of the screen shows its top part only.
 */
export function messageContextMenuLayout({
  anchor,
  window,
  insets,
  menuHeight,
  hasReactions,
}: {
  anchor: MessageMenuRect;
  window: { width: number; height: number };
  insets: { top: number; bottom: number };
  menuHeight: number;
  hasReactions: boolean;
}): { previewTop: number; previewHeight: number; pillTop: number; menuTop: number } {
  const { pillHeight, gap, edge, maxPreviewRatio } = MESSAGE_MENU;
  const above = hasReactions ? pillHeight + gap : 0;
  const below = gap + menuHeight;
  const top = insets.top + edge;
  const bottom = window.height - insets.bottom - edge;
  const previewHeight = Math.max(0, Math.min(anchor.height, window.height * maxPreviewRatio, bottom - top - above - below));
  const minTop = top + above;
  const maxTop = bottom - below - previewHeight;
  const previewTop = Math.min(Math.max(anchor.y, minTop), Math.max(minTop, maxTop));
  return { previewTop, previewHeight, pillTop: previewTop - above, menuTop: previewTop + previewHeight + gap };
}
