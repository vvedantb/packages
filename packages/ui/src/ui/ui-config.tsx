import * as React from "react";
import type { CardConfig } from "./card";
import type { LabelConfig } from "./label";
import type { ListRowConfig } from "./list-row";
import type { LoadingStateConfig } from "./loading-state";
import type { ProgressConfig } from "./progress";
import type { SeparatorConfig } from "./separator";
import type { SonnerToasterConfig } from "./sonner";
import type { CircleSpinnerConfig, SpinnerConfig } from "./spinner";
import type { StatusDotConfig } from "./status-dot";
import type { TableConfig } from "./table";

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
  Card?: CardConfig;
  CircleSpinner?: CircleSpinnerConfig;
  Label?: LabelConfig;
  ListRow?: ListRowConfig;
  LoadingState?: LoadingStateConfig;
  Progress?: ProgressConfig;
  Separator?: SeparatorConfig;
  SonnerToaster?: SonnerToasterConfig;
  Spinner?: SpinnerConfig;
  StatusDot?: StatusDotConfig;
  Table?: TableConfig;
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

export { UiConfigProvider, useUiConfig };
