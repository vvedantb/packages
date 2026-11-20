import { createContext, use } from "react";

/**
 * Layout of the app shell. `"floating"` (default): the page is a rounded card
 * beside a plain icon rail. `"rail"`: no card; rail tiles sit on troughs with
 * a sliding pill, and there are no divider lines.
 */
export type AppShellVariant = "floating" | "rail";

/** How the sidebar panel hides and shows in the `"rail"` variant. */
export type AppShellPanelMotion = "dock" | "none";

/**
 * The `variant` input of `AppShell` and `AppShell.Root`, as a union keyed on
 * `variant`. An input that only one variant takes goes on that arm, with
 * `?: never` on the other, so passing it to the wrong variant is a type error.
 */
export type AppShellVariantProps =
  | {
      /** Default `"floating"`. */
      variant?: "floating";
      panelMotion?: never;
    }
  | {
      variant: "rail";
      /**
       * Rail only. `"dock"` (default): `RailCollapseTile` shrinks the panel
       * into the tile on hide and grows it back out on show. `"none"`: the
       * panel shows and hides at once.
       */
      panelMotion?: AppShellPanelMotion;
    };

export const AppShellVariantContext = createContext<AppShellVariant>("floating");

/** The `variant` of the nearest `AppShell`; `"floating"` outside one. */
export function useAppShellVariant(): AppShellVariant {
  return use(AppShellVariantContext);
}

export const AppShellPanelDockContext = createContext(false);

/** True inside an `AppShell variant="rail"` whose `panelMotion` is `"dock"`. */
export function useAppShellPanelDock(): boolean {
  return use(AppShellPanelDockContext);
}
