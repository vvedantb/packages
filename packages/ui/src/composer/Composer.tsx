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
export type ComposerLayout = "stacked" | "inline";
/**
 * How stop behaves while `streaming`. `"replace"` (default): stop takes the
 * place of send. `"alongside"`: stop and send show together, in the order
 * trailing actions, stop, send.
 */
export type ComposerStopMode = "replace" | "alongside";

export type ComposerInputRenderContext = {
  value: string;
  onChange: (value: string) => void;
  /**
   * Shared key handler. Enter submits (preventDefault, not while composing),
   * Tab accepts the ghost text, Esc dismisses it. It ignores IME composition.
   * Shift+Enter is not handled: the caller decides what a newline does.
   */
  onKeyDown: (event: React.KeyboardEvent) => void;
  /** Visible ghost text including the joining space, or `""`. */
  ghostText: string;
  acceptGhost: () => void;
  dismissGhost: () => void;
  /** Attach to the input element (textarea or contenteditable root). */
  inputRef: React.RefObject<HTMLElement | null>;
  disabled: boolean;
  placeholder: string;
  streaming: boolean;
  maxHeight: number;
  textareaClassName?: string;
};

export type ComposerProps = {
  /** Controlled value. Omit it for an uncontrolled composer. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;

  /**
   * Called with the trimmed draft on Enter or the send button. By default it
   * is not called for an empty draft. A `canSend` override that allows an
   * empty draft calls it with `""`.
   */
  onSubmit?: (value: string) => void | Promise<void>;
  onStop?: () => void;
  /**
   * Shows the stop button. With `stopMode="replace"` (default) it takes the
   * place of send and Enter does not submit. Typing stays enabled.
   */
  streaming?: boolean;
  /** Disables the textarea and the send button. `canSend` cannot override it. */
  disabled?: boolean;
  /**
   * Overrides whether send is enabled. Default: the trimmed draft is not
   * empty. `disabled` and, with `stopMode="replace"`, `streaming` still block
   * send. A function receives the live draft (not trimmed), so check
   * `draft.trim()` yourself. Use it to allow an empty draft when attachments
   * exist: `canSend={(draft) => draft.trim() !== "" || hasAttachments}`.
   */
  canSend?: boolean | ((draft: string) => boolean);
  /** `"replace"` (default) or `"alongside"`. See `ComposerStopMode`. */
  stopMode?: ComposerStopMode;

  placeholder?: string;
  /** Maximum textarea height in px. The textarea scrolls after it. Default 200. */
  maxHeight?: number;
  autoFocus?: boolean;
  /** Classes for the outer shell. */
  className?: string;
  /** `"stacked"` (default): input above, footer bar below. `"inline"`: one row with plus, input and actions. */
  layout?: ComposerLayout;
  /**
   * Supplies your own input (for example a contenteditable editor) in place of
   * the textarea. The shell, slots, send/stop and predictions stay. Autosize
   * and the caret-at-end gate apply to the default textarea only: the caller
   * sizes the editor and decides when ghost text is valid.
   */
  renderInput?: (ctx: ComposerInputRenderContext) => React.ReactNode;
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
const TEXT_METRICS_BASE = "block w-full text-sm leading-6 break-words whitespace-pre-wrap";
const textMetrics = (layout: ComposerLayout) =>
  cn(TEXT_METRICS_BASE, layout === "inline" ? "px-2 py-1" : "px-4 pt-3.5 pb-1");

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


type SlotNode<C> = React.ReactNode | ((ctx: C) => React.ReactNode);

export type ComposerShellProps = {
  layout?: ComposerLayout;
  disabled?: boolean;
  streaming?: boolean;
  /** Enables the send button. Always a boolean: `Composer` resolves its function form. */
  canSend?: boolean;
  /** `"replace"` (default) or `"alongside"`. Alongside while streaming: trailing actions, stop, send. */
  stopMode?: ComposerStopMode;
  onSend?: () => void;
  onStop?: () => void;
  plusMenu?: SlotNode<ComposerSlotContext>;
  trailingActions?: SlotNode<ComposerTrailingContext>;
  attachments?: React.ReactNode;
  className?: string;
  /** The input region: a textarea, a contenteditable, plus any ghost overlay. */
  children?: React.ReactNode;
};

/**
 * Outer chrome of the composer: border, field tokens, focus ring, attachments,
 * plus-menu and trailing slots, and send or stop. Put your input in `children`.
 * The focus ring follows any descendant with the `data-composer-input`
 * attribute that matches `:focus-visible`.
 */
function ComposerShell({
  layout = "stacked",
  disabled = false,
  streaming = false,
  canSend = false,
  stopMode = "replace",
  onSend,
  onStop,
  plusMenu,
  trailingActions,
  attachments,
  className,
  children,
}: ComposerShellProps) {
  const plus = typeof plusMenu === "function" ? plusMenu({ disabled }) : plusMenu;
  const trailing =
    typeof trailingActions === "function"
      ? trailingActions({ disabled, streaming })
      : trailingActions;
  const inline = layout === "inline";

  const stopButton = (
    <ComposerIconButton
      variant="default"
      aria-label="Stop generating"
      data-slot="composer-stop"
      onClick={() => onStop?.()}
    >
      <IconPlayerStop className="size-4" aria-hidden="true" />
    </ComposerIconButton>
  );
  const sendButton = (
    <ComposerIconButton
      variant="default"
      aria-label="Send message"
      data-slot="composer-send"
      disabled={!canSend}
      onClick={() => onSend?.()}
    >
      <IconArrowUp className="size-4" aria-hidden="true" />
    </ComposerIconButton>
  );
  const action = !streaming ? (
    sendButton
  ) : stopMode === "alongside" ? (
    <>
      {stopButton}
      {sendButton}
    </>
  ) : (
    stopButton
  );

  return (
    <div
      data-slot="composer"
      data-layout={layout}
      data-disabled={disabled || undefined}
      data-streaming={streaming || undefined}
      data-stop-mode={stopMode}
      className={cn(
        "group/composer relative flex w-full min-w-0 flex-col rounded-[1.25rem] border border-border bg-field-background text-sm transition-[border-color,box-shadow] duration-200 ease-smooth",
        "has-[[data-composer-input]:focus-visible]:border-focus-border has-[[data-composer-input]:focus-visible]:ring-1 has-[[data-composer-input]:focus-visible]:ring-focus-ring",
        disabled && "opacity-60",
        className,
      )}
    >
      {attachments ? (
        <div data-slot="composer-attachments" className="flex flex-wrap items-center gap-2 px-3 pt-3">
          {attachments}
        </div>
      ) : null}

      {inline ? (
        <div data-slot="composer-row" className="flex min-w-0 items-end gap-1 p-1.5">
          {plus ? <div className="flex shrink-0 items-center gap-1">{plus}</div> : null}
          <div data-slot="composer-input-region" className="relative min-w-0 flex-1">
            {children}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {trailing}
            {action}
          </div>
        </div>
      ) : (
        <>
          <div data-slot="composer-input-region" className="relative min-w-0">
            {children}
          </div>
          <div data-slot="composer-footer" className="flex items-center gap-1 px-2 pt-1 pb-2">
            {plus ? <div className="flex items-center gap-1">{plus}</div> : null}
            <div className="ml-auto flex items-center gap-1">
              {trailing}
              {action}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type ComposerGhostTextProps = {
  value: string;
  ghostText: string;
  className?: string;
};

/**
 * Input-agnostic ghost overlay. It renders the draft invisibly, then the ghost
 * text, so the ghost lands after the last character. Position it absolutely
 * under (or over) your input and give it the same padding and font classes.
 */
const ComposerGhostText = React.forwardRef<HTMLDivElement, ComposerGhostTextProps>(
  function ComposerGhostText({ value, ghostText, className }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        data-slot="composer-ghost"
        className={cn(
          "pointer-events-none absolute inset-0 overflow-y-auto [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:bg-transparent",
          className,
        )}
      >
        <span className="invisible">{value}</span>
        {ghostText ? <span className="text-muted-foreground/50">{ghostText}</span> : null}
      </div>
    );
  },
);

/**
 * Chat composer: autosizing textarea, plus-menu and action slots, send/stop
 * button and optional ghost-text predictions. The ref points at the textarea.
 */
/** @deprecated Use `InputArea` from `@vvedantb/ui`. Kept unchanged for existing consumers. */
const Composer = React.forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    value: valueProp,
    defaultValue = "",
    onChange,
    onSubmit,
    onStop,
    streaming = false,
    disabled = false,
    canSend: canSendProp,
    stopMode = "replace",
    placeholder = "Message",
    maxHeight = DEFAULT_MAX_HEIGHT,
    autoFocus,
    className,
    textareaClassName,
    layout = "stacked",
    renderInput,
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
  const customInputRef = React.useRef<HTMLElement | null>(null);
  const custom = renderInput !== undefined;
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
    enabled: (custom || caretAtEnd) && !disabled && !streaming,
    getPrediction,
    debounceMs: predictionDebounceMs,
    minLength: predictionMinLength,
  });
  const ghost = prediction.ghost;

  // Autosize: grow with the content up to `maxHeight`, then scroll.
  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (custom || !el) return;
    el.style.height = "auto";
    const full = el.scrollHeight;
    el.style.height = `${Math.min(full, maxHeight)}px`;
    el.style.overflowY = full > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight, custom]);

  const syncScroll = () => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };
  React.useLayoutEffect(syncScroll, [value, ghost]);

  const override = typeof canSendProp === "function" ? canSendProp(value) : canSendProp;
  const canSend =
    !disabled &&
    (stopMode === "alongside" || !streaming) &&
    (override ?? value.trim() !== "");

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

  const acceptGhost = () => {
    if (!ghost) return;
    prediction.clear();
    setValue(acceptComposerPrediction(value, ghost));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const el = event.currentTarget;
    const native = event.nativeEvent;
    if (native.isComposing || event.keyCode === 229) return;

    if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      // The caret gate applies to the default textarea only. A custom input owns it.
      const atEnd = custom || !(el instanceof HTMLTextAreaElement) || isCaretAtEnd(el);
      if (ghost && atEnd) {
        event.preventDefault();
        acceptGhost();
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

  const metrics = textMetrics(layout);

  const input = renderInput ? (
    renderInput({
      value,
      onChange: setValue,
      onKeyDown,
      ghostText: ghost,
      acceptGhost,
      dismissGhost: prediction.dismiss,
      inputRef: customInputRef,
      disabled,
      placeholder,
      streaming,
      maxHeight,
      textareaClassName,
    })
  ) : (
    <>
      <ComposerGhostText
        ref={mirrorRef}
        value={value}
        ghostText={ghost}
        className={cn(metrics, textareaClassName)}
      />
      <textarea
        ref={setRefs}
        data-slot="composer-textarea"
        data-composer-input=""
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
          metrics,
          "relative resize-none overflow-y-hidden border-0 bg-transparent text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed",
          textareaClassName,
        )}
      />
    </>
  );

  return (
    <ComposerShell
      layout={layout}
      disabled={disabled}
      streaming={streaming}
      canSend={canSend}
      stopMode={stopMode}
      onSend={submit}
      onStop={onStop}
      plusMenu={plusMenu}
      trailingActions={trailingActions}
      attachments={attachments}
      className={className}
    >
      {input}
    </ComposerShell>
  );
});

export { Composer, ComposerGhostText, ComposerIconButton, ComposerShell };
