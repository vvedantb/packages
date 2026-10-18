import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import { IconArrowUp, IconLoader2, IconPlayerStop } from "@tabler/icons-react";
import { cn } from "../../utils/cn";
import { Button } from "../../ui/button";
import { InputGroupAddon } from "../../ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
} from "../../ai-elements/prompt-input";
import { SpeechInput } from "../../ai-elements/speech-input";
import { chatInputContainerClass } from "../../ui/surface-classes";
import { ComposerSlashMenu } from "./ComposerSlashMenu";
import { FadePresence } from "./FadePresence";
import { InputActions } from "./InputActions";
import { motionFast } from "./motion";
import type { ComposerSlashItem } from "./composerSlashItems";
import { useComposerCompact } from "./useComposerCompact";
import { useComposerSlashMenu } from "./useComposerSlashMenu";
import { useInputAreaPrediction } from "./useInputAreaPrediction";

const COMPACT_EDITOR =
  "flex min-h-9 max-h-9 min-w-0 w-auto flex-1 items-center self-center overflow-hidden whitespace-pre! rounded-none px-1 py-2 text-left leading-5";
const COMPACT_START_ADDON =
  "order-first shrink-0 justify-start gap-1 py-0 pl-1.5 pr-0 has-[>button]:ml-0";
const COMPACT_END_ADDON =
  "order-last shrink-0 justify-end gap-1 py-0 pr-1.5 pl-1 has-[>button]:mr-0";

export const DEFAULT_ATTACH_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,application/pdf";

export type InputAreaSlashContext = {
  /** Opens the file picker, as the `attach` slash action does. */
  openFilePicker: () => void;
};

export type InputAreaProps = {
  value?: string;
  onChange?: (value: string) => void;
  /** Initial text when `value` is omitted (uncontrolled). */
  defaultValue?: string;
  placeholder?: string;

  /** Called with the trimmed text. The input clears first, through `onChange`. */
  onSubmit?: (text: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  isSending?: boolean;
  isUploading?: boolean;
  /** When omitted: the draft has text, or `fileCount` or `chipCount` is above 0. */
  canSubmit?: boolean;

  /** Inputs to the compact pill. */
  fileCount?: number;
  chipCount?: number;

  showDictate?: boolean;
  showFileUpload?: boolean;
  /** Replaces the built-in file picker click. */
  onAttachFile?: () => void;
  /** Receives files chosen in the picker or dropped on the input. */
  onFilesSelected?: (files: FileList) => void;
  attachAccept?: string;
  /** Receives dictated text. Default: append it to the draft. */
  onDictateTranscription?: (text: string) => void;

  banners?: ReactNode;
  promoBanner?: ReactNode;
  queue?: ReactNode;
  /** Attachment strip. Shown inside the input, above the text. */
  attachments?: ReactNode;
  /** Chip row. Shown inside the input, above the text. */
  chips?: ReactNode;
  /** Extra rows in the plus menu after the attach row. Include your own separators. */
  plusMenuExtra?: ReactNode;

  /** Items for the `/` menu. Omit to turn the menu off. */
  slashItems?: ComposerSlashItem[];
  onSlashSelect?: (item: ComposerSlashItem, context: InputAreaSlashContext) => void;
  /** Wrap a slash row, for example in a hover card. Return `row` for the default. */
  renderSlashItem?: (item: ComposerSlashItem, row: ReactNode) => ReactNode;

  /** Returns a continuation for the draft. Omit to turn ghost text off. */
  getPrediction?: (text: string) => Promise<string>;
  predictionEnabled?: boolean;

  /** Wrapper around banners, queue and the input. */
  className?: string;
  /** Extra classes on the input container. */
  containerClassName?: string;
  /** Border and ring classes for the input container. */
  borderClassName?: string;
  submitButtonClassName?: string;
  submitIconClassName?: string;

  /** Called on Backspace at the start of the text while `chipCount` is above 0. */
  onRemoveLastChip?: () => void;
};

export function InputArea({
  value: controlledValue,
  onChange,
  defaultValue = "",
  placeholder = "Ask anything...",
  onSubmit,
  onStop,
  isStreaming = false,
  isSending = false,
  isUploading = false,
  canSubmit,
  fileCount = 0,
  chipCount = 0,
  showDictate = false,
  showFileUpload = true,
  onAttachFile,
  onFilesSelected,
  attachAccept = DEFAULT_ATTACH_ACCEPT,
  onDictateTranscription,
  banners,
  promoBanner,
  queue,
  attachments,
  chips,
  plusMenuExtra,
  slashItems,
  onSlashSelect,
  renderSlashItem,
  getPrediction,
  predictionEnabled = true,
  className,
  containerClassName,
  borderClassName,
  submitButtonClassName,
  submitIconClassName,
  onRemoveLastChip,
}: InputAreaProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const input = isControlled ? controlledValue : internalValue;
  const setInput = (next: string) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFiles = fileCount > 0;

  const openFilePicker = () => {
    if (onAttachFile) onAttachFile();
    else fileInputRef.current?.click();
  };

  const { chromeRef, compact } = useComposerCompact({
    value: input,
    fileCount,
    chipCount,
  });

  const items = slashItems ?? [];
  const slashMenu = useComposerSlashMenu({
    value: input,
    onValueChange: setInput,
    items,
    textareaRef: inputRef,
    onSelect: (item) => onSlashSelect?.(item, { openFilePicker }),
    enabled: items.length > 0,
  });
  const prediction = useInputAreaPrediction({
    value: input,
    suspended: slashMenu.showPopup,
    enabled: predictionEnabled,
    getPrediction,
  });

  const textareaClassName = cn(
    "bg-transparent! shadow-none border-none",
    "text-sm md:text-[15px] leading-5 placeholder:text-muted-foreground",
    "smooth-typing-input field-sizing-content focus-visible:outline-hidden",
    compact
      ? COMPACT_EDITOR
      : "min-h-16 max-h-50 w-full self-stretch overflow-y-auto rounded-none px-4 pt-3.5 pb-1 text-left",
  );

  const submitDisabled =
    isUploading ||
    isSending ||
    !(canSubmit ?? (input.trim() !== "" || hasFiles || chipCount > 0));

  const handleSubmit = (textOverride?: string) => {
    if (isSending) return;
    const text = (textOverride || input).trim();
    if (!(canSubmit ?? (text !== "" || hasFiles || chipCount > 0))) return;
    setInput("");
    onSubmit?.(text);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    onFilesSelected?.(event.target.files);
    event.target.value = "";
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;
      if (!isInputFocused && inputRef.current) {
        const textarea = inputRef.current;
        textarea.focus();
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const plusButton = (
    <InputActions
      showFileUpload={showFileUpload}
      onAttachFile={openFilePicker}
      compact={compact}
      extra={plusMenuExtra}
    />
  );

  const sendTools = (
    <div className="flex shrink-0 items-center gap-0.5">
      <FadePresence show={showDictate}>
        <SpeechInput
          size="icon-sm"
          variant="ghost"
          className="rounded-full bg-transparent text-muted-foreground hover:bg-surface-secondary hover:text-foreground max-sm:hit-target"
          onTranscriptionChange={(text) =>
            onDictateTranscription
              ? onDictateTranscription(text)
              : setInput(input + (input ? " " : "") + text)
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
                  onClick={onStop}
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
            disabled={submitDisabled}
            className={cn(
              "size-9 rounded-full max-sm:hit-target",
              submitButtonClassName,
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
                <IconArrowUp className={submitIconClassName} width={18} />
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
    <LazyMotion features={domAnimation}>
    <TooltipProvider>
      <div className="min-w-0 shrink-0 overflow-x-clip">
        {showFileUpload && onFilesSelected ? (
          <input
            ref={fileInputRef}
            type="file"
            accept={attachAccept}
            onChange={handleFileInputChange}
            multiple
            className="hidden"
          />
        ) : null}
        <div className={className}>
          {promoBanner}
          {banners}
          {queue}
          <div className="flex w-full flex-col">
            <div
              ref={chromeRef}
              data-composer-slash-anchor=""
              className="w-full"
            >
              <PromptInput
                onSubmit={(message) => {
                  handleSubmit(message.text);
                }}
                className="w-full"
                containerClassName={cn(
                  "flex w-full min-w-0 [interpolate-size:allow-keywords] transition-[color,box-shadow,border-color,border-radius,height] duration-200",
                  chatInputContainerClass,
                  compact
                    ? "h-12 flex-row flex-nowrap items-center rounded-full py-1 has-[>textarea]:h-12"
                    : "h-auto flex-col items-start rounded-surface",
                  borderClassName,
                  containerClassName,
                )}
                onDragOver={
                  showFileUpload && onFilesSelected
                    ? (event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                      }
                    : undefined
                }
                onDrop={
                  showFileUpload && onFilesSelected
                    ? (event) => {
                        event.preventDefault();
                        if (event.dataTransfer.files.length > 0) {
                          onFilesSelected(event.dataTransfer.files);
                        }
                      }
                    : undefined
                }
              >
                {showFileUpload ? attachments : null}
                {chips}
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
                        <span className="text-muted-foreground">
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
                        prediction.suggestion &&
                          "caret-current text-transparent",
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
                          chipCount > 0
                        ) {
                          event.preventDefault();
                          onRemoveLastChip?.();
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
                    items={items}
                    query={slashMenu.trigger?.query ?? ""}
                    selectedIndex={slashMenu.selectedIndex}
                    onHoverIndex={slashMenu.setSelectedIndex}
                    onSelectItem={slashMenu.onSelectItem}
                    renderItem={renderSlashItem}
                  />
                ) : null}
              </AnimatePresence>,
              document.body,
            )
          : null}
      </div>
    </TooltipProvider>
    </LazyMotion>
  );
}
