import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

// `ChoiceQuestion` (`/ai`): an agent's blocking question, as the web chat's
// question dock. The answer shape is behavioural; the look is a source check.

vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: { default: string }) => o.default },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}));
vi.mock("@tabler/icons-react-native", () => ({}));
vi.mock("../src/Badge", () => ({ Badge: "Badge" }));
vi.mock("../src/Button", () => ({ Button: "Button" }));
vi.mock("../src/Input", () => ({ Input: "Input" }));
vi.mock("../src/theme", () => ({ useLargerText: () => false }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src", "ai", "choice-question.tsx"), "utf8");

const questions = [
  {
    question: "How should I fix the flaky test?",
    header: "Fix",
    multiSelect: false,
    options: [
      { label: "Wait for the form", description: "" },
      { label: "Mock the call", description: "" },
    ],
  },
  {
    question: "Which browsers?",
    header: "Scope",
    multiSelect: true,
    options: [
      { label: "Chrome", description: "" },
      { label: "Safari", description: "" },
    ],
  },
];

describe("ChoiceQuestion", () => {
  it("answers question text to label, joining multi-select with \", \"", async () => {
    const { choiceAnswers } = await import("../src/ai/choice-question");
    expect(choiceAnswers(questions, { 0: ["Mock the call"], 1: ["Chrome", "Safari"] }, {}, {})).toEqual({
      "How should I fix the flaky test?": "Mock the call",
      "Which browsers?": "Chrome, Safari",
    });
  });

  it("uses the trimmed typed answer when Other is on, ignoring picks", async () => {
    const { choiceAnswers } = await import("../src/ai/choice-question");
    expect(choiceAnswers(questions, { 0: ["Mock the call"] }, { 0: "  Retry twice  " }, { 0: true })).toMatchObject({
      "How should I fix the flaky test?": "Retry twice",
      "Which browsers?": "",
    });
  });

  it("draws the web dock: header badge, step count, lettered rows, Other..., Back and Next/Submit", () => {
    expect(source).toMatch(/const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"/);
    expect(source).toMatch(/<Badge variant="secondary" className="px-2 py-0\.5"[^>]*>\s*\{question\.header\}/);
    expect(source).toMatch(/`\$\{step \+ 1\}\/\$\{total\}`/);
    expect(source).toMatch(/otherLabel = "Other\.\.\."/);
    expect(source).toMatch(/otherPlaceholder = "Type your answer\.\.\."/);
    expect(source).toMatch(/\{isLast \? "Submit" : "Next"\}/);
    expect(source).toMatch(/variant="ghost"[\s\S]*Back/);
    // Picked rows: a 2-wide primary ring; the mark turns into a check on the primary fill.
    expect(source).toMatch(/borderColor: selected \? palette\.primary\[scheme\] : "transparent"/);
    expect(source).toMatch(/<IconCheck size=\{glyph\} strokeWidth=\{3\}/);
  });
});
