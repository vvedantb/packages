import type { ComponentProps, ReactNode } from "react";
import { IconCpu } from "@tabler/icons-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useCn } from "../ui/ui-config";
import { cn } from "../utils/cn";
import { ProviderIcon } from "./provider-icon";

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorProps = ComponentProps<typeof Dialog>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelector = (props: ModelSelectorProps) => (
  <Dialog {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent
    aria-describedby={undefined}
    className={cn("border-0 p-0", className)}
    {...props}
  >
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="data-[slot=command-input-wrapper]:**:h-auto">
      {children}
    </Command>
  </DialogContent>
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorDialogProps = ComponentProps<typeof CommandDialog>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorDialog = (props: ModelSelectorDialogProps) => (
  <CommandDialog {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorInput = ({
  className,
  ...props
}: ModelSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorListProps = ComponentProps<typeof CommandList>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorList = (props: ModelSelectorListProps) => (
  <CommandList {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
  <CommandEmpty {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => (
  <CommandGroup {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorItem = (props: ModelSelectorItemProps) => (
  <CommandItem {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => (
  <CommandShortcut {...props} />
);

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => (
  <CommandSeparator {...props} />
);

/**
 * @deprecated Use `ModelPicker`. Removed in the next minor release.
 *
 * Now SVG props: the logo renders `ProviderIcon` (see `ModelSelectorLogo`).
 */
export type ModelSelectorLogoProps = Omit<
  ComponentProps<"svg">,
  "children"
> & {
  /** Rendered width and height in px. Default 12, the old `<img>` size. */
  size?: number;
  provider:
    | "moonshotai-cn"
    | "lucidquery"
    | "moonshotai"
    | "zai-coding-plan"
    | "alibaba"
    | "xai"
    | "vultr"
    | "nvidia"
    | "upstage"
    | "groq"
    | "github-copilot"
    | "mistral"
    | "vercel"
    | "nebius"
    | "deepseek"
    | "alibaba-cn"
    | "google-vertex-anthropic"
    | "venice"
    | "chutes"
    | "cortecs"
    | "github-models"
    | "togetherai"
    | "azure"
    | "baseten"
    | "huggingface"
    | "opencode"
    | "fastrouter"
    | "google"
    | "google-vertex"
    | "cloudflare-workers-ai"
    | "inception"
    | "wandb"
    | "openai"
    | "zhipuai-coding-plan"
    | "perplexity"
    | "openrouter"
    | "zenmux"
    | "v0"
    | "iflowcn"
    | "synthetic"
    | "deepinfra"
    | "zhipuai"
    | "submodel"
    | "zai"
    | "inference"
    | "requesty"
    | "morph"
    | "lmstudio"
    | "anthropic"
    | "aihubmix"
    | "fireworks-ai"
    | "modelscope"
    | "llama"
    | "scaleway"
    | "amazon-bedrock"
    | "cerebras"
    // oxlint-disable-next-line typescript-eslint(ban-types) -- intentional pattern for autocomplete-friendly string union
    | (string & {});
};

/**
 * models.dev provider ids that have a `ProviderIcon` mark. `ProviderIcon`
 * knows four marks: Claude, OpenAI (`codex`), OpenCode and Cursor.
 */
const LOGO_PROVIDER: Record<string, string> = {
  anthropic: "claude",
  "google-vertex-anthropic": "claude",
  claude: "claude",
  openai: "codex",
  codex: "codex",
  opencode: "opencode",
  cursor: "cursor",
};

/**
 * @deprecated Use `ModelPicker`. Removed in the next minor release.
 *
 * A thin wrapper over `ProviderIcon`: no network fetch (it used to load
 * `https://models.dev/logos/<provider>.svg`). `anthropic`,
 * `google-vertex-anthropic` and `claude` show the Claude mark; `openai` and
 * `codex` the OpenAI mark; `opencode` and `cursor` their marks. Any other id
 * shows a neutral CPU glyph, not another brand's mark. The SVG keeps the old
 * `"<provider> logo"` accessible name.
 */
export const ModelSelectorLogo = ({
  provider,
  size = 12,
  className,
  ...props
}: ModelSelectorLogoProps) => {
  const merge = useCn();
  const mapped = LOGO_PROVIDER[provider];
  const label = `${provider} logo`;
  if (!mapped) {
    return (
      <IconCpu
        {...props}
        role="img"
        aria-label={label}
        size={size}
        className={merge("shrink-0 text-muted-foreground", className)}
      />
    );
  }
  return (
    <ProviderIcon
      {...props}
      role="img"
      aria-label={label}
      aria-hidden={false}
      provider={mapped}
      size={size}
      className={className}
    />
  );
};

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorLogoGroupProps = ComponentProps<"div">;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorLogoGroup = ({
  className,
  ...props
}: ModelSelectorLogoGroupProps) => {
  const merge = useCn();
  return (
    <div
      className={merge(
        "flex shrink-0 items-center -space-x-1 [&>svg]:rounded-full [&>svg]:bg-surface [&>svg]:p-px",
        className,
      )}
      {...props}
    />
  );
};

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export type ModelSelectorNameProps = ComponentProps<"span">;

/** @deprecated Use `ModelPicker`. Removed in the next minor release. */
export const ModelSelectorName = ({
  className,
  ...props
}: ModelSelectorNameProps) => (
  <span className={cn("flex-1 truncate text-left", className)} {...props} />
);
