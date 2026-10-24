"use client";

import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../ui/dropdown-menu";
import { useCn, useUiConfig } from "../ui/ui-config";
import { IconDots } from "@tabler/icons-react";

/** One model in `PromptInputSettings`, grouped by `provider`. */
export interface PromptInputSettingsOption<TModel extends string = string> {
  id: TModel;
  provider: string;
  label: string;
}

/**
 * `UiConfig.PromptInputSettings`. `providerLabel` names a provider group
 * (default: the provider id); `providerIcon` renders the icon before a
 * provider and before "Model" (default: none). `classes.trigger` replaces the
 * trigger button's classes.
 */
export interface PromptInputSettingsConfig {
  providerLabel?: (provider: string) => string;
  providerIcon?: (provider: string) => ReactNode;
  classes?: {
    trigger?: string;
  };
}

function getProviderOptions<TModel extends string>(
  options: ReadonlyArray<PromptInputSettingsOption<TModel>>,
  providerLabel: (provider: string) => string,
): ReadonlyArray<{ id: string; label: string }> {
  const providers: Array<{ id: string; label: string }> = [];
  for (const option of options) {
    if (providers.some((provider) => provider.id === option.provider)) {
      continue;
    }
    providers.push({
      id: option.provider,
      label: providerLabel(option.provider),
    });
  }
  return providers;
}

export interface PromptInputSettingsProps<TModel extends string = string> {
  model: TModel;
  onModelChange: (model: TModel) => void;
  options: ReadonlyArray<PromptInputSettingsOption<TModel>>;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

/**
 * Overflow menu for the prompt footer with a "Model" submenu: one radio list,
 * or one submenu per provider when the options span several providers.
 */
export function PromptInputSettings<TModel extends string>({
  model,
  onModelChange,
  options,
  disabled,
  icon,
  className,
}: PromptInputSettingsProps<TModel>) {
  const config = useUiConfig("PromptInputSettings");
  const merge = useCn();
  const providerLabel = config?.providerLabel ?? ((provider: string) => provider);
  const providerIcon = config?.providerIcon;
  const selectedModel =
    options.find((entry) => entry.id === model) ?? options[0] ?? null;
  const providerOptions = getProviderOptions(options, providerLabel);
  const handleValueChange = (nextValue: string) => {
    const option = options.find((entry) => entry.id === nextValue);
    if (option) {
      onModelChange(option.id);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={merge(
            config?.classes?.trigger ??
              "rounded-lg p-1.5 text-muted-foreground transition-[color,background-color,scale] duration-150 ease-out hover:bg-surface-secondary hover:text-foreground active:scale-[0.92] disabled:opacity-50",
            className,
          )}
          disabled={disabled}
        >
          {icon ?? <IconDots size={16} />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {providerIcon?.(selectedModel?.provider ?? "")}
            Model
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {providerOptions.map((provider) => {
              const models = options.filter(
                (option) => option.provider === provider.id,
              );
              const radios = (
                <DropdownMenuRadioGroup
                  key={provider.id}
                  value={selectedModel?.id}
                  onValueChange={handleValueChange}
                >
                  {models.map((option) => (
                    <DropdownMenuRadioItem key={option.id} value={option.id}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              );
              if (providerOptions.length === 1) return radios;
              return (
                <DropdownMenuSub key={provider.id}>
                  <DropdownMenuSubTrigger>
                    {providerIcon?.(provider.id)}
                    {provider.label}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>{radios}</DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
