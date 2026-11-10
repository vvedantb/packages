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
    expect(source).toMatch(/\{question\.header \? <TopicBadge>\{question\.header\}<\/TopicBadge> : null\}/);
    expect(source).toMatch(/`\$\{step \+ 1\}\/\$\{total\}`/);
    expect(source).toMatch(/otherLabel = "Other\.\.\."/);
    expect(source).toMatch(/otherPlaceholder = "Type your answer\.\.\."/);
    expect(source).toMatch(/buttonLabel\(isLast \? "Submit" : "Next", "primary"\)/);
    expect(source).toMatch(/variant="ghost"[\s\S]*Back/);
    // Picked rows: a 2-wide primary ring; the mark turns into a check on the primary fill.
    expect(source).toMatch(/\{selected \? \([\s\S]*?borderWidth: 1,\s*borderColor: palette\.primary\[scheme\],/);
    expect(source).toMatch(/<IconCheck size=\{glyph\} strokeWidth=\{3\}/);
  });

  it("uses the web dock type: 15 / 20.625 question, 10 / 14 semibold topic, 12 / 19.5 descriptions, opt-in semibold buttons", () => {
    // `text-[15px] leading-snug`.
    expect(source).toMatch(/lineHeight: largerText \? 24 : 15 \* 1\.375/);
    // Eva's `Badge` is `px-2.5 py-0.5 font-semibold`, the question's `text-3xs`.
    expect(source).toMatch(/className="rounded-full px-2\.5 py-0\.5"/);
    expect(source).toMatch(/const fontSize = largerText \? 14 : 10;/);
    // Descriptions are `text-xs leading-relaxed`; "Other..." is plain `text-sm` until picked.
    expect(source).toMatch(/sizeStyle\(chatTextSize\("caption", largerText\), "relaxed"\)/);
    expect(source).toMatch(/const plain = mark === "other" && !selected;/);
    expect(source).toMatch(/buttonWeight = "medium"/);
    expect(source).toMatch(/buttonWeight === "medium" \? \(\s*text/);
    // Web `Card` with no border width, `py-2 px-2.5`.
    expect(source).toMatch(/const CARD_PADDING = \{ top: 8, bottom: 8, left: 10, right: 10 \};[\s\S]*paddingVertical: CARD_PADDING\.top,\s*paddingHorizontal: CARD_PADDING\.left,/);
    expect(source).not.toMatch(/borderWidth: 2/);
  });
});
