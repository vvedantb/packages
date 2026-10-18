import {
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type FocusEventHandler,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../utils/cn";

export const CHIPS_HOST_ATTR = "data-composer-chips-inline";

/** Custom property the ghost `::after` reads its colour from. */
export const GHOST_COLOR_VAR = "--composer-ghost-color";

/**
 * Editor base class. Placeholder and ghost text use `::after`, so both follow
 * the chips on the same line. A class cannot reach a pseudo-element, so the
 * ghost colour comes from `--composer-ghost-color`, read off a probe span that
 * carries `suggestionClassName`. Muted foreground is the fallback.
 */
export const INLINE_EDITOR_CLASS =
  "relative block w-full cursor-text whitespace-pre-wrap wrap-break-word bg-transparent outline-hidden data-empty:after:pointer-events-none data-empty:after:select-none data-empty:after:text-muted-foreground data-empty:after:content-[attr(data-placeholder)] data-suggestion:after:pointer-events-none data-suggestion:after:select-none data-suggestion:after:text-[color:var(--composer-ghost-color,var(--color-muted-foreground))] data-suggestion:after:content-[attr(data-suggestion)]";

// `contents` so each chip is an inline atom in the editor's own flow (same as
// session-composer chip spans). A wrapping flex host becomes one box and puts
// the text in a column beside it.
const CHIPS_HOST_CLASS = "contents empty:hidden [&>*]:mr-1.5";

/** Reads the plain text of the editor. Skips the chips host. */
export function extractEditorText(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node, isRoot: boolean) => {
    node.childNodes.forEach((child, index) => {
      if (child instanceof HTMLElement) {
        if (child.hasAttribute(CHIPS_HOST_ATTR)) return;
        if (child.tagName === "BR") {
          // A trailing <br> only holds the line open.
          if (isRoot && index === node.childNodes.length - 1) return;
          out += "\n";
          return;
        }
        if (child.tagName === "DIV" || child.tagName === "P") {
          if (out !== "" && !out.endsWith("\n")) out += "\n";
          walk(child, false);
          return;
        }
        walk(child, false);
        return;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        out += (child.textContent ?? "").replace(/\u200b/g, "");
      }
    });
  };
  walk(root, true);
  return out;
}

function placeCaretAtEnd(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** True when nothing but the chips host sits before the caret. */
function caretAtTextStart(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const anchor = sel.anchorNode;
  if (!anchor || !root.contains(anchor)) return false;
  const host = root.querySelector(`[${CHIPS_HOST_ATTR}]`);
  if (host?.contains(anchor)) return false;
  const probe = document.createRange();
  probe.selectNodeContents(root);
  if (host) probe.setStartAfter(host);
  probe.setEnd(anchor, sel.anchorOffset);
  return probe.toString().replace(/\u200b/g, "") === "";
}

function insertPlainText(root: HTMLElement, text: string) {
  if (document.execCommand("insertText", false, text)) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  root.dispatchEvent(new Event("input", { bubbles: true }));
}

export type InputAreaEditorProps = {
  editorRef?: Ref<HTMLDivElement>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  suggestion?: string;
  /** Classes for the ghost text. Its colour and opacity are copied to the `::after`. */
  suggestionClassName?: string;
  chips?: ReactNode;
  chipCount?: number;
  onRemoveLastChip?: () => void;
  className?: string;
  /** Runs first. Call `preventDefault` to stop the built-in Enter and Backspace handling. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: FocusEventHandler<HTMLDivElement>;
  /** ARIA props, such as the slash menu combobox props. */
  ariaProps?: Record<string, unknown>;
};

/**
 * Contenteditable editor. The chips host is a non-editable inline atom at the
 * start of the same text flow, so wrapped lines start under the chips. React
 * owns the host only. The text nodes after it belong to the DOM and are
 * reconciled against `value`.
 */
export function InputAreaEditor({
  editorRef,
  value,
  onValueChange,
  placeholder,
  suggestion,
  suggestionClassName,
  chips,
  chipCount = 0,
  onRemoveLastChip,
  className,
  onKeyDown,
  onBlur,
  ariaProps,
}: InputAreaEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const ghostProbeRef = useRef<HTMLSpanElement | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof editorRef === "function") editorRef(node);
    else if (editorRef) editorRef.current = node;
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || composingRef.current) return;
    if (extractEditorText(root) === value) return;
    Array.from(root.childNodes).forEach((child) => {
      if (!(child instanceof HTMLElement && child.hasAttribute(CHIPS_HOST_ATTR))) {
        root.removeChild(child);
      }
    });
    if (value !== "") root.appendChild(document.createTextNode(value));
    if (document.activeElement === root) placeCaretAtEnd(root);
  });

  // Copy the probe colour to the editor. Opacity below 1 is folded into the
  // colour, so the `::after` needs one variable.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const probe = ghostProbeRef.current;
    const style = probe ? getComputedStyle(probe) : null;
    if (!style?.color) {
      root.style.removeProperty(GHOST_COLOR_VAR);
      return;
    }
    const opacity = Number.parseFloat(style.opacity);
    root.style.setProperty(
      GHOST_COLOR_VAR,
      opacity >= 0 && opacity < 1
        ? `color-mix(in srgb, ${style.color} ${opacity * 100}%, transparent)`
        : style.color,
    );
  }, [suggestion, suggestionClassName]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const root = event.currentTarget;
    if (event.key === "Enter") {
      if (composingRef.current || event.nativeEvent.isComposing) return;
      if (event.shiftKey) return;
      event.preventDefault();
      const form = root.closest("form");
      const submitButton = form?.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      if (submitButton?.disabled) return;
      form?.requestSubmit();
      return;
    }
    if (
      event.key === "Backspace" &&
      chipCount > 0 &&
      caretAtTextStart(root)
    ) {
      event.preventDefault();
      onRemoveLastChip?.();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (text) insertPlainText(event.currentTarget, text);
  };

  return (
    <>
      <div
        ref={setRefs}
        data-slot="input-group-control"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        aria-label={placeholder}
        aria-multiline
        {...ariaProps}
        role="combobox"
        data-empty={value === "" ? "" : undefined}
        data-placeholder={placeholder}
        data-suggestion={suggestion || undefined}
        className={cn(INLINE_EDITOR_CLASS, className)}
        onInput={(event) => {
          if (composingRef.current) return;
          onValueChange(extractEditorText(event.currentTarget));
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          onValueChange(extractEditorText(event.currentTarget));
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={onBlur}
      >
        <span
          contentEditable={false}
          {...{ [CHIPS_HOST_ATTR]: "" }}
          className={CHIPS_HOST_CLASS}
        >
          {chips}
        </span>
      </div>
      {suggestion && suggestionClassName ? (
        // Outside the editor, so reconciliation and the text value never see it.
        // Zero-size, not `display: none`, so the computed colour is real.
        <span
          aria-hidden
          data-composer-ghost-probe=""
          className="pointer-events-none absolute size-0 select-none overflow-hidden text-foreground"
        >
          <span ref={ghostProbeRef} className={suggestionClassName} />
        </span>
      ) : null}
    </>
  );
}
