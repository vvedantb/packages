import { useRef, type RefObject } from "react";
import {
  draftExceedsPillWidth,
  editorOverflowsHorizontally,
  isComposerCompact,
  readEditorInnerWidth,
} from "./composerCompact";

export function useComposerCompact({
  value,
  fileCount,
  chipCount,
}: {
  value: string;
  fileCount: number;
  chipCount: number;
}): { chromeRef: RefObject<HTMLDivElement | null>; compact: boolean } {
  "use no memo";
  const chromeRef = useRef<HTMLDivElement>(null);
  const pillWidthRef = useRef(0);
  const wasCompactRef = useRef(true);

  const editorNode =
    chromeRef.current?.querySelector("[data-slot=input-group-control]") ??
    chromeRef.current?.querySelector("textarea");
  const editor = editorNode instanceof HTMLElement ? editorNode : null;
  const font = editor ? getComputedStyle(editor).font : "14px sans-serif";
  if (editor && wasCompactRef.current) {
    const inner = readEditorInnerWidth(editor);
    if (inner > 0) pillWidthRef.current = inner;
  }
  const exceedsPill =
    (editor !== null &&
      wasCompactRef.current &&
      editorOverflowsHorizontally(editor)) ||
    draftExceedsPillWidth(value, pillWidthRef.current, font);
  const compact = isComposerCompact({
    value,
    fileCount,
    chipCount,
    exceedsPill,
  });
  wasCompactRef.current = compact;

  return { chromeRef, compact };
}
