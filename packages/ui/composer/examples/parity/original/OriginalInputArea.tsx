// FROZEN SNAPSHOT of the app InputAreaCore JSX (apps/web/src/components/chat/input/InputAreaCore.tsx).
// Only the data layer is replaced by props: Convex, router, uploads, billing and skills.
// Everything from `textareaClassName` to the end of the render, and the constants below, is verbatim.
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  cn,
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  InputGroupAddon,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  SpeechInput,
  Queue,
  QueueHeader,
  QueueList,
  FadePresence,
} from "@vv/ui";
import type { ActionFeatures, BannerFeatures } from "@app/shared";
import { InputActions } from "./InputActions";
import { ComposerSkillChips } from "@/components/chat/chips/ComposerSkillChips";
import { ComposerAttachmentStrip } from "@/components/chat/chips/ComposerAttachmentStrip";
import { IconArrowUp, IconLoader2, IconPlayerStop } from "@tabler/icons-react";
import { InputBanners } from "./InputBanners";
import { getBorderStyles, submitButtonStyles } from "../utils";
import { chatInputContainerClass } from "@/lib/flat-tabs";
import { chatComposerClassName } from "@/components/chat/transcript/transcriptClass";
import { AnimatePresence, m } from "motion/react";
import { motionFast } from "@/lib/motion/presets";
import { useComposerCompact } from "./useComposerCompact";
import { ComposerSlashMenu } from "./ComposerSlashMenu";
import { useComposerSlashMenu } from "./useComposerSlashMenu";
import { buildComposerSlashItems } from "./composerSlashItems";

export interface OriginalInputAreaProps {
  actionFeatures: ActionFeatures;
  bannerFeatures: BannerFeatures;
  initialValue: string;
  placeholder: string;
  showBanners: boolean;
  showUpgradeBanner: boolean;
  showFileUpload: boolean;
  isStreaming: boolean;
  isSending: boolean;
  isUploading: boolean;
  fileCount: number;
  chipCount: number;
}

const COMPACT_EDITOR =
  "flex min-h-9 max-h-9 min-w-0 w-auto flex-1 items-center self-center overflow-hidden whitespace-pre! rounded-none px-1 py-2 text-left leading-5";
const COMPACT_START_ADDON =
  "order-first shrink-0 justify-start gap-1 py-0 pl-1.5 pr-0 has-[>button]:ml-0";
const COMPACT_END_ADDON =
  "order-last shrink-0 justify-end gap-1 py-0 pr-1.5 pl-1 has-[>button]:mr-0";
export function OriginalInputArea(props: OriginalInputAreaProps) {
  const {
    actionFeatures,
    bannerFeatures,
    placeholder,
    showBanners,
    showUpgradeBanner,
    showFileUpload,
    isStreaming,
    isSending,
    isUploading,
  } = props;
  const [input, setInput] = useState(props.initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFiles = props.fileCount > 0;
  const activeBannerFeatures: BannerFeatures = bannerFeatures;
  const skillSelection = { chips: Array.from({ length: props.chipCount }), removeChip: () => {}, removeLastChip: () => {} } as any;
  const abort = () => {};
  const queue = { count: 0, items: [] as any[], update: () => {}, remove: () => {} };
  const [queueOpen, setQueueOpen] = useState(true);
  const borderStyles = getBorderStyles(activeBannerFeatures);
  const previewAttachments: any[] = [];
  const handleRemovePreviewFile = () => {};
  const handleFilesSelect = (_files: FileList) => {};
  const handleFileInputChange = () => {};
  const { chromeRef, compact } = useComposerCompact({
    value: input,
    fileCount: props.fileCount,
    chipCount: props.chipCount,
  });
  const slashItems = buildComposerSlashItems({
    actionFeatures,
    bannerFeatures,
    showFileUpload,
    includeNewChat: true,
    hubSkills: [],
    manualSkills: [],
    selectedManualIds: [],
  });
  const slashMenu = useComposerSlashMenu({
    value: input,
    onValueChange: setInput,
    items: slashItems,
    textareaRef: inputRef,
    onSelect: () => {},
  });
  const prediction = { suggestion: undefined as string | undefined, dismiss: () => {} };
  const handleSubmit = (_text?: string) => {};
  const textareaClassName = cn(
    "bg-transparent! shadow-none border-none",
    "text-sm md:text-[15px] leading-5 placeholder:text-muted-foreground",
    "smooth-typing-input field-sizing-content focus-visible:outline-hidden",
    compact
      ? COMPACT_EDITOR
      : "min-h-16 max-h-50 w-full self-stretch overflow-y-auto rounded-none px-4 pt-3.5 pb-1 text-left",
  );
  const plusButton = (
    <InputActions
      showFileUpload={showFileUpload}
      onAttachFile={() => fileInputRef.current?.click()}
      compact={compact}
    />
  );
  const sendTools = (
    <div className="flex shrink-0 items-center gap-0.5">
      <FadePresence show={Boolean(actionFeatures.dictate)}>
        <SpeechInput
          size="icon-sm"
          variant="ghost"
          className="rounded-full bg-transparent text-muted-foreground hover:bg-surface-secondary hover:text-foreground max-sm:hit-target"
          onTranscriptionChange={(text) =>
            setInput(input + (input ? " " : "") + text)
          }
          lang="en-US"
        />
      </FadePresence>
      <AnimatePresence initial={false}>
        {isStreaming ? (
          <m.div
            key="composer-stop"
            className="inline-flex"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={motionFast}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  type="button"
                  variant="destructive"
                  className="rounded-full max-sm:hit-target"
                  onClick={abort}
                  aria-label="Stop generating"
                >
                  <IconPlayerStop className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop generating</TooltipContent>
            </Tooltip>
          </m.div>
        ) : null}
      </AnimatePresence>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            type="submit"
            disabled={
              isUploading ||
              isSending ||
              (!input.trim() && !hasFiles && skillSelection.chips.length === 0)
            }
            className={cn(
              "size-9 rounded-full max-sm:hit-target",
              submitButtonStyles.bg,
            )}
          >
            <span className="relative inline-flex size-5 items-center justify-center">
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out",
                  isUploading || isSending ? "opacity-100" : "opacity-0",
                )}
              >
                <IconLoader2 className="size-4 animate-spin" />
              </span>
              <span
                className={cn(
                  "flex items-center justify-center transition-opacity duration-150 ease-out",
                  isUploading || isSending ? "opacity-0" : "opacity-100",
                )}
              >
                <IconArrowUp className={submitButtonStyles.text} width={18} />
              </span>
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isStreaming ? "Queue message" : "Send message"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
  return (
    <div className="min-w-0 shrink-0 overflow-x-clip">
      {showFileUpload ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
          onChange={handleFileInputChange}
          multiple
          className="hidden"
        />
      ) : null}
      <div className={chatComposerClassName}>
        {showUpgradeBanner ? null : null}
        {showBanners && <InputBanners features={activeBannerFeatures} />}
        <Queue count={queue.count} className="w-full">
          <QueueHeader
            count={queue.count}
            isOpen={queueOpen}
            onToggle={() => setQueueOpen(!queueOpen)}
          />
          <QueueList open={queueOpen}>
          </QueueList>
        </Queue>
        <div className="flex w-full flex-col">
          <div ref={chromeRef} data-composer-slash-anchor="" className="w-full">
            <PromptInput
              onSubmit={(message) => {
                void handleSubmit(message.text);
              }}
              className="w-full"
              containerClassName={cn(
                "flex w-full min-w-0 [interpolate-size:allow-keywords] transition-[color,box-shadow,border-color,border-radius,height] duration-200",
                chatInputContainerClass,
                compact
                  ? "h-12 flex-row flex-nowrap items-center rounded-full py-1 has-[>textarea]:h-12"
                  : "h-auto flex-col items-start rounded-surface",
                borderStyles,
              )}
              onDragOver={
                showFileUpload
                  ? (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }
                  : undefined
              }
              onDrop={
                showFileUpload
                  ? (event) => {
                      event.preventDefault();
                      if (event.dataTransfer.files.length > 0) {
                        handleFilesSelect(event.dataTransfer.files);
                      }
                    }
                  : undefined
              }
            >
              {showFileUpload ? (
                <ComposerAttachmentStrip
                  files={previewAttachments}
                  onRemove={handleRemovePreviewFile}
                />
              ) : null}
              <ComposerSkillChips
                chips={skillSelection.chips}
                onRemove={skillSelection.removeChip}
              />
              {compact ? (
                <InputGroupAddon
                  align="inline-start"
                  className={COMPACT_START_ADDON}
                >
                  {plusButton}
                </InputGroupAddon>
              ) : null}
              <PromptInputBody>
                <div
                  className={cn(
                    "relative min-w-0",
                    compact ? "flex-1" : "w-full self-stretch",
                  )}
                >
                  {prediction.suggestion ? (
                    <div
                      aria-hidden
                      className={cn(
                        textareaClassName,
                        "pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap wrap-break-word text-foreground",
                      )}
                    >
                      {input}
                      <span className="text-muted">
                        {prediction.suggestion}
                      </span>
                    </div>
                  ) : null}
                  <PromptInputTextarea
                    ref={inputRef}
                    value={input}
                    placeholder={placeholder}
                    className={cn(
                      textareaClassName,
                      "relative z-10",
                      prediction.suggestion && "caret-current text-transparent",
                    )}
                    rows={1}
                    role={slashMenu.comboboxProps.role}
                    aria-multiline={slashMenu.comboboxProps["aria-multiline"]}
                    aria-haspopup={slashMenu.comboboxProps["aria-haspopup"]}
                    aria-autocomplete={
                      slashMenu.comboboxProps["aria-autocomplete"]
                    }
                    aria-expanded={slashMenu.comboboxProps["aria-expanded"]}
                    aria-controls={slashMenu.comboboxProps["aria-controls"]}
                    aria-activedescendant={
                      slashMenu.comboboxProps["aria-activedescendant"]
                    }
                    onKeyDown={(event) => {
                      if (slashMenu.onKeyDown(event)) return;
                      if (prediction.suggestion) {
                        if (event.key === "Tab" && !event.shiftKey) {
                          event.preventDefault();
                          setInput(input + prediction.suggestion);
                          return;
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          prediction.dismiss();
                          return;
                        }
                      }
                      if (
                        event.key === "Backspace" &&
                        event.currentTarget.selectionStart === 0 &&
                        event.currentTarget.selectionEnd === 0 &&
                        skillSelection.chips.length > 0
                      ) {
                        event.preventDefault();
                        skillSelection.removeLastChip();
                      }
                    }}
                    onBlur={slashMenu.onBlur}
                    onChange={(e) => {
                      setInput(e.currentTarget.value);
                    }}
                  />
                </div>
              </PromptInputBody>
              {compact ? (
                <InputGroupAddon
                  align="inline-end"
                  className={COMPACT_END_ADDON}
                >
                  {sendTools}
                </InputGroupAddon>
              ) : (
                <PromptInputFooter className="w-full min-w-0 flex-nowrap px-3 pb-3 pt-0">
                  <PromptInputTools>{plusButton}</PromptInputTools>
                  {sendTools}
                </PromptInputFooter>
              )}
            </PromptInput>
          </div>
        </div>
      </div>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {slashMenu.showPopup && slashMenu.placement ? (
                <ComposerSlashMenu
                  key="slash"
                  listboxId={slashMenu.listboxId}
                  placement={slashMenu.placement}
                  items={slashItems}
                  query={slashMenu.trigger?.query ?? ""}
                  selectedIndex={slashMenu.selectedIndex}
                  onHoverIndex={slashMenu.setSelectedIndex}
                  onSelectItem={slashMenu.onSelectItem}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
