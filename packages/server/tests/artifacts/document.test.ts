import { describe, expect, it } from "vitest";
import {
  ARTIFACT_CSP,
  ARTIFACT_FORMAT_FILES,
  artifactFileName,
  formatFromLanguage,
  wrapArtifactDocument,
} from "@vvedantb/server";

const quiz = JSON.stringify({
  title: "Capitals",
  questions: [{ id: "q1", prompt: "France?", options: ["Paris", "Lyon"], correctIndex: 0 }],
});

describe("formatFromLanguage", () => {
  it("maps html and markdown fences", () => {
    expect(formatFromLanguage("html")).toBe("html");
    expect(formatFromLanguage("htm")).toBe("html");
    expect(formatFromLanguage("HTML")).toBe("html");
    expect(formatFromLanguage(undefined)).toBe("html");
    expect(formatFromLanguage("svg")).toBe("svg");
    expect(formatFromLanguage("markdown")).toBe("markdown");
    expect(formatFromLanguage("md")).toBe("markdown");
    expect(formatFromLanguage("tsx")).toBe("code");
  });
});

describe("wrapArtifactDocument", () => {
  it("puts the CSP and guest in every format", () => {
    for (const format of ["html", "markdown", "svg", "code", "json"] as const) {
      const doc = wrapArtifactDocument("x", format);
      expect(doc, format).toContain(ARTIFACT_CSP);
      expect(doc, format).toContain("window.artifactState=state");
    }
  });

  it("keeps a full HTML page and wraps a fragment", () => {
    const page = "<!doctype html><html><head><title>t</title></head><body>p</body></html>";
    expect(wrapArtifactDocument(page, "html")).toMatch(/^<!doctype html><html><head><meta http-equiv=.*<title>t<\/title>/s);
    expect(wrapArtifactDocument("<p>frag</p>", "html")).toContain("<body><p>frag</p></body>");
  });

  it("centres SVG and shows markdown and code as escaped text", () => {
    expect(wrapArtifactDocument("<svg></svg>", "svg")).toContain("place-items:center;min-height:100vh;background:#fff\"><svg></svg>");
    const code = wrapArtifactDocument("a < b && <script>", "code");
    expect(code).toContain("<pre>a &lt; b &amp;&amp; &lt;script&gt;</pre>");
    expect(wrapArtifactDocument("# Title", "markdown")).toContain("<pre># Title</pre>");
  });

  it("renders quiz and flashcards JSON with the built-in templates", () => {
    expect(wrapArtifactDocument(quiz, "json")).toContain("Capitals quiz");
    const deck = JSON.stringify({ cards: [{ id: "1", front: "Q", back: "A" }] });
    expect(wrapArtifactDocument(deck, "json", {}, { title: "Fallback", template: "flashcards" })).toContain("Fallback flashcards");
    // An unparseable JSON body still renders, as text.
    expect(wrapArtifactDocument("{ nope", "json")).toContain("<pre>{ nope</pre>");
  });

  it("uses a named template for any format, falling back to the format when it does not parse", () => {
    expect(wrapArtifactDocument(quiz, "html", {}, { template: "quiz" })).toContain("Capitals quiz");
    expect(wrapArtifactDocument("<p>free</p>", "html", {}, { template: "quiz" })).toContain("<body><p>free</p></body>");
    // Without a template, an html body is never parsed as JSON.
    expect(wrapArtifactDocument(quiz, "html")).not.toContain("Capitals quiz");
  });

  it("passes the snapshot and the aliases to the guest", () => {
    const doc = wrapArtifactDocument("<p>x</p>", "html", { score: "1" }, { stateGlobalAliases: ["app"] });
    expect(doc).toContain('window.__ARTIFACT_SNAPSHOT__={"score":"1"};');
    expect(doc).toContain('window.__ARTIFACT_ALIASES__=["app"];');
    expect(() => wrapArtifactDocument("x", "html", {}, { stateGlobalAliases: ["document"] })).toThrow("Invalid artifact state alias");
  });
});

describe("download names", () => {
  it("map each format to an extension and MIME type", () => {
    expect(ARTIFACT_FORMAT_FILES.markdown).toEqual({ extension: "md", mime: "text/markdown" });
    expect(artifactFileName('a/b:"c"', "svg")).toBe("a-b--c-.svg");
    expect(artifactFileName("Notes", "code")).toBe("Notes.txt");
  });
});
