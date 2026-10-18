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

const ZERO_WIDTH_SPACE = "\u200b";

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
        out += (child.textContent ?? "").replaceAll(ZERO_WIDTH_SPACE, "");
      }
    });
  };
  walk(root, true);
  return out;
}

function chipsHost(root: HTMLElement): HTMLElement | null {
  for (const child of root.children) {
    if (child instanceof HTMLElement && child.hasAttribute(CHIPS_HOST_ATTR)) return child;
  }
  return null;
}

/**
 * Returns the text node right after the chips host, creating it if missing.
 * It starts with U+200B, so the caret always has an editable position after
 * the chips, even with an empty draft. `extractEditorText` strips U+200B.
 */
function ensureCaretAnchor(root: HTMLElement): Text {
  const existing = findCaretAnchor(root);
  if (existing) return existing;
  const host = chipsHost(root);
  const anchor = document.createTextNode(ZERO_WIDTH_SPACE);
  root.insertBefore(anchor, host ? host.nextSibling : root.firstChild);
  return anchor;
}

function findCaretAnchor(root: HTMLElement): Text | null {
  const host = chipsHost(root);
  const next = host ? host.nextSibling : root.firstChild;
  return next instanceof Text && next.data.startsWith(ZERO_WIDTH_SPACE) ? next : null;
}

function setSelection(
  anchorNode: Node,
  anchorOffset: number,
  focusNode: Node = anchorNode,
  focusOffset: number = anchorOffset,
) {
  window.getSelection()?.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
}

/** End of the text: the last text node, or the end of the editor after a line break. */
function textEnd(root: HTMLElement): [Node, number] {
  ensureCaretAnchor(root);
  const last = root.lastChild;
  if (last instanceof Text) return [last, last.length];
  return [root, root.childNodes.length];
}

/** Puts a collapsed caret at the end of the text, after the chips host. */
export function placeCaretAtEnd(root: HTMLElement) {
  const [node, offset] = textEnd(root);
  setSelection(node, offset);
}

/**
 * Moves any selection end that sits inside or before the chips host to the
 * first text position after it. The host is React's, so the caret must never
 * rest in it and an edit must never delete it.
 */
export function normaliseSelection(root: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const { startContainer, startOffset, endContainer, endOffset } = range;
  if (!root.contains(startContainer) || !root.contains(endContainer)) return;
  const anchor = ensureCaretAnchor(root);
  const first = document.createRange();
  first.setStart(anchor, 1);
  // The host comes first, so only the start can be before the text unless both are.
  if (first.comparePoint(startContainer, startOffset) >= 0) return;
  const endBefore = first.comparePoint(endContainer, endOffset) < 0;
  const [end, endAt]: [Node, number] = endBefore ? [anchor, 1] : [endContainer, endOffset];
  const backwards =
    !range.collapsed &&
    sel.anchorNode === endContainer &&
    sel.anchorOffset === endOffset;
  if (backwards) setSelection(end, endAt, anchor, 1);
  else setSelection(anchor, 1, end, endAt);
}

/** Selects the text only, never the chips host. */
function selectText(root: HTMLElement) {
  const anchor = ensureCaretAnchor(root);
  const [node, offset] = textEnd(root);
  setSelection(anchor, 1, node, offset);
}

/**
 * Width the inline chips take before the text on the first line. The host is
 * `display: contents` and has no box, so this measures where the text starts.
 */
export function readInlineChipsWidth(root: HTMLElement): number {
  const anchor = findCaretAnchor(root);
  if (!anchor || !chipsHost(root)?.childElementCount) return 0;
  // A text offset, not an element boundary: Chromium gives no rect for the latter.
  const textStart = document.createRange();
  textStart.setStart(anchor, 0);
  const style = getComputedStyle(root);
  const contentLeft =
    root.getBoundingClientRect().left +
    root.clientLeft +
    (Number.parseFloat(style.paddingLeft) || 0);
  return Math.max(0, textStart.getBoundingClientRect().left - contentLeft);
}

/** True when nothing but the chips host sits before the caret. */
function caretAtTextStart(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const anchor = sel.anchorNode;
  if (!anchor || !root.contains(anchor)) return false;
  const host = chipsHost(root);
  if (host?.contains(anchor)) return false;
  const probe = document.createRange();
  probe.selectNodeContents(root);
  if (host) probe.setStartAfter(host);
  probe.setEnd(anchor, sel.anchorOffset);
  const before = probe.cloneContents();
  return (
    (before.textContent ?? "").replaceAll(ZERO_WIDTH_SPACE, "") === "" &&
    before.querySelector("br, div, p") === null
  );
}

/** Clicks on chip controls, such as remove buttons, keep their own behaviour. */
function isChipControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest("button, a, input, [role=button]");
  return control?.closest(`[${CHIPS_HOST_ATTR}]`) != null;
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
 * reconciled against `value`, behind a U+200B caret anchor that keeps an
 * editable position after the chips.
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

  const assignEditorRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof editorRef === "function") editorRef(node);
    else if (editorRef) editorRef.current = node;
  };

  const keepCaretOutsideChips = (root: HTMLElement) => {
    if (!composingRef.current) normaliseSelection(root);
  };

  // Native listeners: React has no `selectionchange`, and its `onBeforeInput`
  // does not see deletions.
  const setRefs = (node: HTMLDivElement) => {
    assignEditorRef(node);
    const keepSelectionOutsideChips = () => {
      if (document.activeElement === node) keepCaretOutsideChips(node);
    };
    document.addEventListener("selectionchange", keepSelectionOutsideChips);
    node.addEventListener("beforeinput", keepSelectionOutsideChips);
    return () => {
      document.removeEventListener("selectionchange", keepSelectionOutsideChips);
      node.removeEventListener("beforeinput", keepSelectionOutsideChips);
      assignEditorRef(null);
    };
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || composingRef.current) return;
    if (extractEditorText(root) !== value) {
      Array.from(root.childNodes).forEach((child) => {
        if (!(child instanceof HTMLElement && child.hasAttribute(CHIPS_HOST_ATTR))) {
          root.removeChild(child);
        }
      });
      root.appendChild(document.createTextNode(ZERO_WIDTH_SPACE + value));
      if (document.activeElement === root) placeCaretAtEnd(root);
    }
    ensureCaretAnchor(root);
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
    if (composingRef.current || event.nativeEvent.isComposing) return;
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();
      selectText(root);
      return;
    }
    // Before the default action, so a selection never spans the chips host.
    normaliseSelection(root);
    if (event.key === "Enter") {
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
    // Nothing visible to delete. The default would eat the U+200B anchor.
    if (event.key === "Backspace" && caretAtTextStart(root)) {
      event.preventDefault();
      if (chipCount > 0) onRemoveLastChip?.();
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
          ensureCaretAnchor(event.currentTarget);
          onValueChange(extractEditorText(event.currentTarget));
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          ensureCaretAnchor(event.currentTarget);
          onValueChange(extractEditorText(event.currentTarget));
        }}
        onKeyDown={handleKeyDown}
        onFocus={(event) => keepCaretOutsideChips(event.currentTarget)}
        onMouseUp={(event) => {
          if (!isChipControl(event.target)) keepCaretOutsideChips(event.currentTarget);
        }}
        onKeyUp={(event) => keepCaretOutsideChips(event.currentTarget)}
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
