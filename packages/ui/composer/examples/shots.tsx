import { createRoot } from "react-dom/client";
import { InputArea } from "../../src/composer/input-area/InputArea";
import { chip } from "./inputarea-harness/fixtures";
import "./inputarea-harness/styles.css";
const three = ["review", "summarise", "draft-reply"];
const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
const cases: [string, any][] = [
  ["short", { defaultValue: "Summarise the notes" }],
  ["chips3-short", { defaultValue: "Summarise the notes", chips: three.map(chip), chipCount: 3 }],
  ["chips3-wrap", { defaultValue: words(40), chips: three.map(chip), chipCount: 3 }],
  ["empty-ghost", { defaultValue: "", placeholder: "Ask anything..." }],
  ["ghost-text", { defaultValue: "Summarise the", getPrediction: async () => " meeting notes from today", predictionEnabled: true }],
];
function M({ theme }: { theme: "light" | "dark" }) {
  return <section className={`${theme === "dark" ? "dark" : ""} bg-background p-6 text-foreground`}>
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {cases.map(([k, p]) => <div key={k} data-case={`${theme}-${k}`} className="p-2">
        <InputArea showFileUpload={false} predictionEnabled={false} {...p} />
      </div>)}
    </div></section>;
}
const t = (new URLSearchParams(location.search).get("theme") ?? "light") as "light" | "dark";
if (t === "dark") document.documentElement.classList.add("dark");
document.body.className = "bg-background";
createRoot(document.getElementById("root")!).render(<M theme={t} />);
