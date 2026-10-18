let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === "undefined") return null;
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return null;
  measureCtx = context;
  return context;
}

export function isComposerCompact({
  value,
  fileCount,
  chipCount,
  exceedsPill,
}: {
  value: string;
  fileCount: number;
  chipCount: number;
  exceedsPill: boolean;
}): boolean {
  if (fileCount > 0) return false;
  if (chipCount > 0) return false;
  if (value.trim().length === 0) return true;
  if (value.includes("\n")) return false;
  return !exceedsPill;
}

export function editorOverflowsHorizontally(editor: HTMLElement): boolean {
  return editor.scrollWidth > editor.clientWidth + 1;
}

export function readEditorInnerWidth(editor: HTMLElement): number {
  const style = getComputedStyle(editor);
  const pad =
    (Number.parseFloat(style.paddingLeft) || 0) +
    (Number.parseFloat(style.paddingRight) || 0);
  return Math.max(0, editor.clientWidth - pad);
}

export function draftExceedsPillWidth(
  text: string,
  widthPx: number,
  font: string,
): boolean {
  if (widthPx <= 0 || text.length === 0) return false;
  const ctx = getMeasureContext();
  if (ctx === null) return false;
  ctx.font = font;
  return ctx.measureText(text).width > widthPx;
}
