import { createRoot } from "react-dom/client";
import { InputArea } from "../../../src/composer/input-area/InputArea";
import "./styles.css";

const chipClass =
  "inline-flex max-sm:max-w-full items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground";

const chip = (name: string) => (
  <button key={name} type="button" className={chipClass}>
    /{name}
  </button>
);

// Narrow column so wrap states are visible. Newlines force expanded chrome for
// multi-line cases (pill width is not measured until after the first paint).
const LINE =
  "word word word word word word word word word word word word";
const texts: Record<string, string> = {
  empty: "",
  short: "Summarise the notes",
  "just before wrap":
    "word word word word word word word word word word word",
  "wraps to 2 lines": `${LINE}\n${LINE}`,
  "wraps to 3 lines": `${LINE}\n${LINE}\n${LINE}`,
};
const chipSets: Record<string, string[]> = {
  "0 chips": [],
  "1 chip": ["review"],
  "3 chips": ["review", "summarise", "draft-reply"],
};

function Matrix({ theme }: { theme: "light" | "dark" }) {
  return (
    <section
      className={`${theme === "dark" ? "dark" : ""} bg-background p-6 text-foreground`}
      data-theme={theme}
      data-harness-theme={theme}
    >
      <h2 className="mb-4 text-lg font-semibold">{theme}</h2>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        {Object.entries(chipSets).flatMap(([cLabel, names]) =>
          Object.entries(texts).map(([tLabel, text]) => (
            <div
              key={`${cLabel}-${tLabel}`}
              data-harness-case={`${theme}:${cLabel}:${tLabel}`}
            >
              <p className="mb-1 text-xs text-muted-foreground">
                {cLabel} / {tLabel}
              </p>
              <InputArea
                defaultValue={text}
                chipCount={names.length}
                chips={names.length ? names.map(chip) : undefined}
                showFileUpload={false}
                predictionEnabled={false}
              />
            </div>
          )),
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <>
    <Matrix theme="light" />
    <Matrix theme="dark" />
  </>,
);
