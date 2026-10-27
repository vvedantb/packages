import { createContext, useContext } from "react";

/**
 * Where a `Button` sits in a dialog. The web sizes buttons in the compact
 * dialog with descendant selectors, which React Native lacks, so `DialogContent`
 * and `DialogFooter` pass this down instead. `compact`: inside the phone bottom
 * sheet, where buttons are at least 44 high (web `[&_button]:min-h-11`).
 * `stacked`: inside its footer too, where buttons fill the width (web
 * `flex-col-reverse`).
 */
export type DialogLayout = { compact: boolean; stacked: boolean };

export const DialogLayoutContext = createContext<DialogLayout>({
  compact: false,
  stacked: false,
});

export function useDialogLayout(): DialogLayout {
  return useContext(DialogLayoutContext);
}
