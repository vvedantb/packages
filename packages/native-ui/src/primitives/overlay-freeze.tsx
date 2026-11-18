import { useSyncExternalStore } from "react";
import { View } from "react-native";

// Whether a window-level overlay (a React Native `Modal`) is over the app. On
// Android a Modal is a window of its own: it takes the focus as it opens and
// hands it back as it closes, and each time the keyboard handler of a chat
// list (`react-native-keyboard-controller`'s `KeyboardChatScrollView`) scrolls
// the list to its newest message. `ConversationList` freezes that handler
// while this store says an overlay is open, and for `SETTLE_MS` after the last
// one closes, as the focus comes back with the close's fade.

/** How long after the last overlay closes the chat list stays frozen: past the Modal's fade and the focus's return. */
export const SETTLE_MS = 1000;

let open = 0;
let frozen = false;
let settleTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const setFrozen = (next: boolean) => {
  if (frozen === next) return;
  frozen = next;
  for (const listener of listeners) listener();
};

const clearSettle = () => {
  if (settleTimer !== null) clearTimeout(settleTimer);
  settleTimer = null;
};

/** An overlay opened: chat lists stop following the keyboard. */
export function overlayOpened() {
  open += 1;
  clearSettle();
  setFrozen(true);
}

/** An overlay closed: chat lists follow the keyboard again `SETTLE_MS` after the last one. */
export function overlayClosed() {
  open = Math.max(0, open - 1);
  if (open > 0) return;
  clearSettle();
  settleTimer = setTimeout(() => {
    settleTimer = null;
    if (open === 0) setFrozen(false);
  }, SETTLE_MS);
}

/** The reader dragged a chat list: the overlays have closed, so follow the keyboard again at once. */
export function settleOverlays() {
  if (open > 0) return;
  clearSettle();
  setFrozen(false);
}

/**
 * Put on the root view inside a `Modal` (`ref={overlayFreezeRef}`): chat
 * lists ignore keyboard events while it is mounted, and briefly after. A ref
 * callback, so an app's own Modals can use it too, with no effect.
 */
export function overlayFreezeRef(view: View | null) {
  if (view === null) return undefined;
  overlayOpened();
  return () => overlayClosed();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** True while an overlay is open, or just closed: a chat list's keyboard handling waits. */
export function useOverlayFrozen(): boolean {
  return useSyncExternalStore(subscribe, () => frozen, () => false);
}

/**
 * Inside a `Modal`, beside its content: an empty, untouchable view that holds
 * chat lists frozen while the Modal shows (React Native mounts a Modal's
 * children only while it is visible). No size, so the layout is unchanged.
 */
export function OverlayFreezeMark() {
  return <View ref={overlayFreezeRef} pointerEvents="none" style={MARK_STYLE} />;
}

const MARK_STYLE = { position: "absolute", width: 0, height: 0 } as const;
