"use client";

import * as React from "react";
import { IconArrowUp, IconPlayerStop } from "@tabler/icons-react";

import { cn } from "../utils/cn";
import { Button } from "../ui/button";
import {
  COMPOSER_PREDICTION_DEBOUNCE_MS,
  COMPOSER_PREDICTION_MIN_LENGTH,
  acceptComposerPrediction,
} from "./prediction";
import { useComposerPrediction } from "./useComposerPrediction";

export type ComposerSlotContext = { disabled: boolean };
export type ComposerTrailingContext = { disabled: boolean; streaming: boolean };

export type ComposerProps = {
  /** Controlled value. Omit it for an uncontrolled composer. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;

  /** Called with the trimmed draft on Enter or the send button. Never called for an empty draft. */
  onSubmit?: (value: string) => void | Promise<void>;
  onStop?: () => void;
  /** Shows the stop button in place of send. Typing stays enabled. Enter does not submit. */
  streaming?: boolean;
  /** Disables the textarea and the send button. */
  disabled?: boolean;

  placeholder?: string;
  /** Maximum textarea height in px. The textarea scrolls after it. Default 200. */
  maxHeight?: number;
  autoFocus?: boolean;
  /** Classes for the outer shell. */
  className?: string;
  /** Classes for the textarea. Also applied to the ghost text mirror, so keep padding and font here. */
  textareaClassName?: string;

  /** Left of the footer. */
  plusMenu?: React.ReactNode | ((ctx: ComposerSlotContext) => React.ReactNode);
  /** Right of the footer, before send or stop. */
  trailingActions?:
    | React.ReactNode
    | ((ctx: ComposerTrailingContext) => React.ReactNode);
  /** Row above the textarea. The caller renders the chips and their remove buttons. */
  attachments?: React.ReactNode;

  /**
   * Returns the continuation of a draft, shown as ghost text. The package makes
   * no requests: the caller owns the network call and should pass `signal` to it.
   */
  getPrediction?: (draft: string, opts: { signal: AbortSignal }) => Promise<string>;
  /** Default 500 ms. */
  predictionDebounceMs?: number;
  /** Default 12 characters (trimmed). */
  predictionMinLength?: number;
};

const DEFAULT_MAX_HEIGHT = 200;

// The textarea and its ghost text mirror must share these metrics.
const TEXT_METRICS = "block w-full px-4 pt-3.5 pb-1 text-sm leading-6 break-words whitespace-pre-wrap";

function isCaretAtEnd(el: HTMLTextAreaElement): boolean {
  return el.selectionStart === el.selectionEnd && el.selectionEnd === el.value.length;
}

/** Icon-only ghost button for the footer: `plusMenu` triggers, `trailingActions`. */
const ComposerIconButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "ghost", size = "icon-sm", type = "button", ...props }, ref) => (
  <Button
    ref={ref}
    type={type}
    variant={variant}
    size={size}
    className={cn("rounded-full", className)}
    {...props}
  />
));
ComposerIconButton.displayName = "ComposerIconButton";

/**
 * Chat composer: autosizing textarea, plus-menu and action slots, send/stop
 * button and optional ghost-text predictions. The ref points at the textarea.
 */
const Composer = React.forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    value: valueProp,
    defaultValue = "",
    onChange,
    onSubmit,
    onStop,
    streaming = false,
    disabled = false,
    placeholder = "Message",
    maxHeight = DEFAULT_MAX_HEIGHT,
    autoFocus,
    className,
    textareaClassName,
    plusMenu,
    trailingActions,
    attachments,
    getPrediction,
    predictionDebounceMs = COMPOSER_PREDICTION_DEBOUNCE_MS,
    predictionMinLength = COMPOSER_PREDICTION_MIN_LENGTH,
  },
  forwardedRef,
) {
  const isControlled = valueProp !== undefined;
  const [inner, setInner] = React.useState(defaultValue);
  const value = isControlled ? valueProp : inner;

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = React.useRef<HTMLDivElement | null>(null);
  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setInner(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  // Ghost text shows only while the caret sits at the end of the draft.
  const [caretAtEnd, setCaretAtEnd] = React.useState(true);
  const prediction = useComposerPrediction({
    value,
    enabled: caretAtEnd && !disabled && !streaming,
    getPrediction,
    debounceMs: predictionDebounceMs,
    minLength: predictionMinLength,
  });
  const ghost = prediction.ghost;

  // Autosize: grow with the content up to `maxHeight`, then scroll.
  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const full = el.scrollHeight;
    el.style.height = `${Math.min(full, maxHeight)}px`;
    el.style.overflowY = full > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  const syncScroll = () => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };
  React.useLayoutEffect(syncScroll, [value, ghost]);

  const canSend = !disabled && !streaming && value.trim() !== "";

  const submit = () => {
    if (!canSend) return;
    const draft = value.trim();
    const result = onSubmit?.(draft);
    if (!isControlled) setInner("");
    if (!isControlled) onChange?.("");
    prediction.clear();
    if (result && typeof result.then === "function") {
      // A failed async submit gives the draft back, unless the user already typed again.
      result.then(undefined, () => {
        if (!isControlled) setInner((current) => (current === "" ? draft : current));
      });
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    const native = event.nativeEvent;
    if (native.isComposing || event.keyCode === 229) return;

    if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (ghost && isCaretAtEnd(el)) {
        event.preventDefault();
        prediction.clear();
        setValue(acceptComposerPrediction(value, ghost));
      }
      return;
    }
    if (event.key === "Escape") {
      if (ghost) {
        event.preventDefault();
        prediction.dismiss();
      }
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const updateCaret = (el: HTMLTextAreaElement) => setCaretAtEnd(isCaretAtEnd(el));

  const ctx = { disabled };
  const plus = typeof plusMenu === "function" ? plusMenu(ctx) : plusMenu;
  const trailing =
    typeof trailingActions === "function"
      ? trailingActions({ disabled, streaming })
      : trailingActions;

  return (
    <div
      data-slot="composer"
      data-disabled={disabled || undefined}
      data-streaming={streaming || undefined}
      className={cn(
        "group/composer relative flex w-full min-w-0 flex-col rounded-field border border-border bg-field-background text-sm transition-[border-color,box-shadow] duration-200 ease-smooth",
        "has-[textarea:focus-visible]:border-focus-border has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-focus-ring",
        disabled && "opacity-60",
        className,
      )}
    >
      {attachments ? (
        <div data-slot="composer-attachments" className="flex flex-wrap items-center gap-2 px-3 pt-3">
          {attachments}
        </div>
      ) : null}

      <div className="relative min-w-0">
        <div
          ref={mirrorRef}
          aria-hidden="true"
          data-slot="composer-ghost"
          className={cn(
            TEXT_METRICS,
            "pointer-events-none absolute inset-0 overflow-y-auto [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:bg-transparent",
            textareaClassName,
          )}
        >
          <span className="invisible">{value}</span>
          {ghost ? <span className="text-muted-foreground/50">{ghost}</span> : null}
        </div>
        <textarea
          ref={setRefs}
          data-slot="composer-textarea"
          rows={1}
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => {
            setValue(event.target.value);
            updateCaret(event.target);
          }}
          onKeyDown={onKeyDown}
          onSelect={(event) => updateCaret(event.currentTarget)}
          onKeyUp={(event) => updateCaret(event.currentTarget)}
          onClick={(event) => updateCaret(event.currentTarget)}
          onScroll={syncScroll}
          className={cn(
            TEXT_METRICS,
            "relative resize-none overflow-y-hidden border-0 bg-transparent text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed",
            textareaClassName,
          )}
        />
      </div>

      <div data-slot="composer-footer" className="flex items-center gap-1 px-2 pt-1 pb-2">
        {plus ? <div className="flex items-center gap-1">{plus}</div> : null}
        <div className="ml-auto flex items-center gap-1">
          {trailing}
          {streaming ? (
            <ComposerIconButton
              variant="default"
              aria-label="Stop generating"
              data-slot="composer-stop"
              onClick={() => onStop?.()}
            >
              <IconPlayerStop className="size-4" aria-hidden="true" />
            </ComposerIconButton>
          ) : (
            <ComposerIconButton
              variant="default"
              aria-label="Send message"
              data-slot="composer-send"
              disabled={!canSend}
              onClick={submit}
            >
              <IconArrowUp className="size-4" aria-hidden="true" />
            </ComposerIconButton>
          )}
        </div>
      </div>
    </div>
  );
});

export { Composer, ComposerIconButton };
