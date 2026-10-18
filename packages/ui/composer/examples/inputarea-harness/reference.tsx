import { createRoot } from "react-dom/client";
import { InputArea } from "../../../src/composer/input-area/InputArea";
import { chip, chipClass, chipSets, texts } from "./fixtures";
import "./styles.css";

// Static reference of the target chrome: one contenteditable, chips as
// non-editable inline spans in the same flow, compact pill until the text
// wraps, then editor on top and actions below.
const PILL =
  "flex h-12 w-full min-w-0 flex-row flex-nowrap items-center rounded-full border border-border bg-background py-1";
const CARD =
  "flex h-auto w-full min-w-0 flex-col items-start rounded-surface border border-border bg-background";
const COMPACT_EDITOR =
  "flex min-h-9 max-h-9 min-w-0 w-auto flex-1 items-center self-center overflow-hidden whitespace-pre! rounded-none px-1 py-2 text-left text-sm leading-5 outline-hidden";
const EXPANDED_EDITOR =
  "min-h-16 max-h-50 w-full self-stretch overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-none px-4 pt-3.5 pb-1 text-left text-sm leading-5 outline-hidden";
const BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full";

function Reference({ names, text }: { names: string[]; text: string }) {
  // Approximate wrap threshold for the static reference only.
  const expanded = text.length > 36 - names.length * 8 || text.includes("\n");
  const editor = (
    <div
      contentEditable
      suppressContentEditableWarning
      className={expanded ? EXPANDED_EDITOR : COMPACT_EDITOR}
    >
      {names.length ? (
        <span
          contentEditable={false}
          className="mr-1.5 inline-flex max-w-full flex-wrap items-center gap-1.5 align-middle"
        >
          {names.map((n) => (
            <span key={n} className={chipClass}>
              /{n}
            </span>
          ))}
        </span>
      ) : null}
      {text}
    </div>
  );
  const plus = <span className={`${BUTTON} text-muted-foreground`}>+</span>;
  const send = <span className={`${BUTTON} bg-primary text-primary-foreground`}>↑</span>;
  return expanded ? (
    <div className={CARD}>
      {editor}
      <div className="flex w-full items-center justify-between px-3 pb-3">
        {plus}
        {send}
      </div>
    </div>
  ) : (
    <div className={PILL}>
      <span className="pl-1.5">{plus}</span>
      {editor}
      <span className="pr-1.5">{send}</span>
    </div>
  );
}

function Column({ theme }: { theme: "light" | "dark" }) {
  return (
    <section
      className={`${theme === "dark" ? "dark" : ""} bg-background p-6 text-foreground`}
      data-harness-theme={theme}
    >
      <h2 className="mb-4 text-lg font-semibold">{theme}</h2>
      <div className="flex flex-col gap-8">
        {Object.entries(chipSets).flatMap(([cLabel, names]) =>
          Object.entries(texts).map(([tLabel, text]) => (
            <div key={`${cLabel}-${tLabel}`}>
              <p className="mb-1 text-xs text-muted-foreground">
                {cLabel} / {tLabel}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="max-w-md">
                  <p className="mb-1 text-[10px] uppercase text-muted-foreground">
                    Reference
                  </p>
                  <Reference names={names} text={text} />
                </div>
                <div className="max-w-md">
                  <p className="mb-1 text-[10px] uppercase text-muted-foreground">
                    InputArea
                  </p>
                  <InputArea
                    key={`${theme}-${cLabel}-${tLabel}`}
                    defaultValue={text}
                    chipCount={names.length}
                    chips={names.length ? names.map(chip) : undefined}
                    showFileUpload={false}
                    predictionEnabled={false}
                  />
                </div>
              </div>
            </div>
          )),
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <>
    <Column theme="light" />
    <Column theme="dark" />
  </>,
);
