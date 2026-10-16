import { requestConfirm } from "./confirmSkip.js";
import { getAltHeld } from "./useAltHeld.js";

type ConfirmEvent = { altKey?: boolean } | null;

function request(
  open: () => void,
  confirm: () => void,
  event?: ConfirmEvent,
): void {
  requestConfirm(getAltHeld(), open, confirm, event);
}

const api = { request } as const;

/**
 * Confirm helper for menu owners. It must not subscribe to Alt: a re-render of
 * the owner when Alt goes down remounts the open Radix menu and closes it.
 * `ConfirmSkipHint` is the only subscriber and lives inside the open menu.
 * The Alt state is read when the request happens. The returned object is
 * stable and holds no React state, so it is safe to call anywhere.
 */
export function useRequestConfirm() {
  return api;
}
