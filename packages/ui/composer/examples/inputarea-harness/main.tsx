import { createRoot } from "react-dom/client";
import { InputArea } from "../../../src/composer/input-area/InputArea";
import { chip, chipSets, texts } from "./fixtures";
import "./styles.css";

export function Matrix({ theme }: { theme: "light" | "dark" }) {
  return (
    <section
      className={`${theme === "dark" ? "dark" : ""} bg-background p-6 text-foreground`}
      data-theme={theme}
      data-harness-theme={theme}
    >
      <h2 className="mb-4 text-lg font-semibold">{theme}</h2>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
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
                key={`${theme}-${cLabel}-${tLabel}`}
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
