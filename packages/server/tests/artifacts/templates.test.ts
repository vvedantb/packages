import { describe, expect, it } from "vitest";
import {
  buildFlashcardsHtml,
  buildQuizHtml,
  htmlFromArtifactTemplate,
  parseFlashcardsTemplate,
  parseQuizTemplate,
} from "@vvedantb/server";

const question = { id: "q1", prompt: "Capital?", options: ["Paris", "Lyon"], correctIndex: 0 };

describe("template HTML", () => {
  it("builds offline flashcard HTML with keyboard controls", () => {
    const html = buildFlashcardsHtml({ title: "Law", cards: [{ id: "1", front: "Q <one>", back: "A & two" }] });
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).not.toContain("localStorage");
    expect(html).not.toContain("http://");
    expect(html).not.toContain("https://");
    expect(html).not.toContain("fonts.googleapis");
    expect(html).toContain("ArrowLeft");
    expect(html).toContain("Shuffle");
    expect(html).toContain("prefers-color-scheme");
    expect(html).toContain("Instrument Sans");
    expect(html).not.toContain("Q <one>");
    expect(html).toContain("Q \\u003cone>");
    expect(html).toContain("window.artifactState");
    expect(html).toContain("Mark known");
  });

  it("escapes the title", () => {
    const html = buildQuizHtml({ title: '<b>"x"</b>', questions: [question] });
    expect(html).toContain("<title>&lt;b&gt;&quot;x&quot;&lt;/b&gt; quiz</title>");
  });

  it("parses flashcards JSON and quiz JSON", () => {
    const cards = parseFlashcardsTemplate(JSON.stringify({ title: "Law", cards: [{ id: "1", front: "Q", back: "A" }] }));
    expect(cards?.title).toBe("Law");
    expect(cards?.cards).toEqual([{ id: "1", front: "Q", back: "A" }]);
    const quiz = parseQuizTemplate(JSON.stringify({ questions: [question] }));
    expect(quiz?.questions[0]?.correctIndex).toBe(0);
    expect(parseQuizTemplate("<html>not json</html>")).toBeUndefined();
  });

  it("parses the lenient legacy shapes: a bare array, `question` for `prompt`, index ids", () => {
    expect(parseFlashcardsTemplate(JSON.stringify([{ front: "Q", back: "A" }]))?.cards).toEqual([{ id: "0", front: "Q", back: "A" }]);
    expect(parseQuizTemplate(JSON.stringify([{ question: "Q", options: ["a", "b"], correctIndex: 1 }]))?.questions).toEqual([
      { id: "0", prompt: "Q", options: ["a", "b"], correctIndex: 1 },
    ]);
    expect(parseQuizTemplate(JSON.stringify([{ ...question, correctIndex: 2 }]))).toBeUndefined();
    expect(parseQuizTemplate(JSON.stringify([{ ...question, options: ["a"] }]))).toBeUndefined();
    expect(parseFlashcardsTemplate("[]")).toBeUndefined();
  });

  it("builds a quiz that persists score in artifact state", () => {
    const html = buildQuizHtml({ title: "Law", questions: [question] });
    expect(html).toContain("window.artifactState");
    expect(html).not.toContain("localStorage");
    expect(html).toContain("Submit");
    expect(html).toContain("score");
  });

  it("renders template HTML from JSON and falls back when parse fails", () => {
    const fromJson = htmlFromArtifactTemplate({
      title: "Deck",
      template: "flashcards",
      content: JSON.stringify({ cards: [{ id: "1", front: "Q", back: "A" }] }),
    });
    expect(fromJson).toContain("Shuffle");
    expect(fromJson).toContain("Deck flashcards");
    const fromQuizJson = htmlFromArtifactTemplate({ title: "Quiz", content: JSON.stringify({ questions: [question] }) });
    expect(fromQuizJson).toContain("Submit");
    expect(
      htmlFromArtifactTemplate({ title: "Broken", template: "quiz", content: "<!DOCTYPE html><html><body>free form</body></html>" }),
    ).toBeUndefined();
    // A named template does not fall through to the other one.
    expect(htmlFromArtifactTemplate({ title: "Q", template: "flashcards", content: JSON.stringify({ questions: [question] }) })).toBeUndefined();
  });
});
