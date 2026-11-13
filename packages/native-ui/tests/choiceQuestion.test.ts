import { readFileSync } from "node:fs";
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
vi.mock("../src/useReduceMotion", () => ({ useReduceMotion: () => false }));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));

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
});
