import * as React from "react";
import type { ClassValue } from "clsx";
import { cn } from "../utils/cn";

// App-level component defaults. An app wraps its tree in `UiConfigProvider`
// to give components its own classes and behaviour without passing props at
// every call site. Without a provider (or with an empty entry) every component
// renders its built-in default, so apps that do not opt in see no change.
//
// Conventions for an entry:
// - `classes` replaces built-in classes part by part. A part left out keeps
//   its default. A caller `className` still merges after it with `cn`.
// - Other keys are default prop values. An explicit prop always wins.
//
// Each component declares its entry type next to its code and adds it here.
export interface UiConfig {
  /**
   * Class merger used in place of the built-in `cn` by components that read
   * it. Set it when the app's own tailwind-merge setup differs (for example
   * when it does not treat `rounded-surface` as a radius class), so a caller
   * `className` merges with the app's classes the way it always has.
   */
  cn?: (...inputs: ClassValue[]) => string;
}

const UiConfigContext = React.createContext<UiConfig>({});

export interface UiConfigProviderProps {
  config: UiConfig;
  children?: React.ReactNode;
}

function UiConfigProvider({ config, children }: UiConfigProviderProps) {
  return <UiConfigContext.Provider value={config}>{children}</UiConfigContext.Provider>;
}

/** The app's entry for one component, or `undefined` when the app sets none. */
function useUiConfig<K extends keyof UiConfig>(name: K): UiConfig[K] | undefined {
  return React.useContext(UiConfigContext)[name];
}

/** The app's class merger (`UiConfig.cn`), or the built-in `cn`. */
function useCn(): (...inputs: ClassValue[]) => string {
  return React.useContext(UiConfigContext).cn ?? cn;
}

export { UiConfigProvider, useCn, useUiConfig };
