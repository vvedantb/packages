import * as React from "react";
import type { ClassValue } from "clsx";
import { cn } from "../utils/cn";
import type { AccordionConfig } from "./accordion";
import type { ActivityQuestionCardConfig } from "../ai-elements/activity-question";
import type { ActivityTasksConfig } from "../ai-elements/activity-shared";
import type { ArtifactConfig } from "../ai-elements/artifact";
import type { AttachmentsConfig } from "../ai-elements/attachments";
import type { BadgeConfig } from "./badge";
import type { ButtonConfig } from "./button";
import type { ButtonGroupConfig } from "./button-group";
import type { CalendarConfig } from "./calendar";
import type { CardConfig } from "./card";
import type { CarouselConfig } from "./carousel";
import type { CheckboxConfig } from "./checkbox";
import type { SpinnerConfig } from "./spinner";
import type { ClearInputConfig } from "./clear-input";
import type { CodeBlockConfig } from "../ai-elements/code-block";
import type { CollapsibleConfig } from "./collapsible";
import type { CommandConfig } from "./command";
import type { ContextMenuConfig } from "./context-menu";
import type { ConversationConfig } from "../ai-elements/conversation";
import type { DialogConfig } from "./dialog";
import type { DropdownMenuConfig } from "./dropdown-menu";
import type { GanttConfig } from "../kibo/gantt-provider";
import type { HoverCardConfig } from "./hover-card";
import type { InputConfig } from "./input";
import type { InputGroupConfig } from "./input-group";
import type { KanbanConfig } from "../kibo/kanban";
import type { LabelConfig } from "./label";
import type { ListRowConfig } from "./list-row";
import type { LoadingStateConfig } from "./loading-state";
import type { MessageConfig } from "../ai-elements/message";
import type { ModelPickerConfig } from "../ai-elements/model-picker";
import type { PopoverConfig } from "./popover";
import type { ProgressConfig } from "./progress";
import type { PromptInputConfig } from "../ai-elements/prompt-input";
import type { PromptInputSettingsConfig } from "../ai-elements/prompt-input-settings";
import type { QueueConfig } from "../ai-elements/queue";
import type { SearchInputConfig } from "./search-input";
import type { SelectConfig } from "./select";
import type { SeparatorConfig } from "./separator";
import type { SettingsEmptyStateConfig } from "../../app/src/settings/SettingsEmptyState";
import type { SettingsSectionConfig } from "../../app/src/settings/SettingsSection";
import type { ShimmerConfig } from "../ai-elements/shimmer";
import type { SliderConfig } from "./slider";
import type { SonnerToasterConfig } from "./sonner";
import type { StatusDotConfig } from "./status-dot";
import type { SwitchConfig } from "./switch";
import type { TableConfig } from "./table";
import type { TabsConfig } from "./tabs";
import type { TextareaConfig } from "./textarea";
import type { ThemeSwitcherConfig } from "../kibo/theme-switcher";
import type { TooltipConfig } from "./tooltip";
import type { TraitsPanelConfig } from "../ai-elements/prompt-input-traits";
import type { VideoPlayerConfig } from "../kibo/video-player";

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
  Accordion?: AccordionConfig;
  ActivityQuestionCard?: ActivityQuestionCardConfig;
  ActivityTasks?: ActivityTasksConfig;
  Artifact?: ArtifactConfig;
  Attachments?: AttachmentsConfig;
  Badge?: BadgeConfig;
  Button?: ButtonConfig;
  ButtonGroup?: ButtonGroupConfig;
  Calendar?: CalendarConfig;
  Card?: CardConfig;
  Carousel?: CarouselConfig;
  Checkbox?: CheckboxConfig;
  ClearInput?: ClearInputConfig;
  CodeBlock?: CodeBlockConfig;
  Collapsible?: CollapsibleConfig;
  Command?: CommandConfig;
  ContextMenu?: ContextMenuConfig;
  Conversation?: ConversationConfig;
  Dialog?: DialogConfig;
  DropdownMenu?: DropdownMenuConfig;
  Gantt?: GanttConfig;
  HoverCard?: HoverCardConfig;
  Input?: InputConfig;
  InputGroup?: InputGroupConfig;
  Kanban?: KanbanConfig;
  Label?: LabelConfig;
  ListRow?: ListRowConfig;
  LoadingState?: LoadingStateConfig;
  Message?: MessageConfig;
  ModelPicker?: ModelPickerConfig;
  Popover?: PopoverConfig;
  Progress?: ProgressConfig;
  PromptInput?: PromptInputConfig;
  PromptInputSettings?: PromptInputSettingsConfig;
  Queue?: QueueConfig;
  SearchInput?: SearchInputConfig;
  Select?: SelectConfig;
  Separator?: SeparatorConfig;
  SettingsEmptyState?: SettingsEmptyStateConfig;
  SettingsSection?: SettingsSectionConfig;
  Shimmer?: ShimmerConfig;
  Slider?: SliderConfig;
  SonnerToaster?: SonnerToasterConfig;
  Spinner?: SpinnerConfig;
  StatusDot?: StatusDotConfig;
  Switch?: SwitchConfig;
  Table?: TableConfig;
  Tabs?: TabsConfig;
  Textarea?: TextareaConfig;
  ThemeSwitcher?: ThemeSwitcherConfig;
  Tooltip?: TooltipConfig;
  TraitsPanel?: TraitsPanelConfig;
  VideoPlayer?: VideoPlayerConfig;
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
