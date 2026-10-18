import { describe, expect, it } from "vitest";
import {
  findSlashTrigger,
  isValidSlashTrigger,
  matchesSlashQuery,
  stripSlashTrigger,
} from "./composerSlashTrigger";

describe("isValidSlashTrigger", () => {
  it("opens at the start of the input", () => {
    expect(isValidSlashTrigger("/", 0)).toBe(true);
    expect(isValidSlashTrigger("/web", 0)).toBe(true);
  });

  it("opens after whitespace", () => {
    expect(isValidSlashTrigger("hello /", 6)).toBe(true);
    expect(isValidSlashTrigger("hello\n/", 6)).toBe(true);
  });

  it("does not open mid-word", () => {
    expect(isValidSlashTrigger("https://x", 6)).toBe(false);
    expect(isValidSlashTrigger("a/b", 1)).toBe(false);
  });

  it("closes once the query contains whitespace", () => {
    expect(isValidSlashTrigger("/web search", 0)).toBe(false);
    expect(isValidSlashTrigger("/web\n", 0)).toBe(false);
  });
});

describe("findSlashTrigger", () => {
  it("uses the last valid slash", () => {
    expect(findSlashTrigger("see /one /tw")).toEqual({
      query: "tw",
      startIndex: 9,
    });
  });

  it("returns null when there is no trigger", () => {
    expect(findSlashTrigger("hello")).toBeNull();
    expect(findSlashTrigger("https://x")).toBeNull();
  });
});

describe("stripSlashTrigger", () => {
  it("removes the slash token and leaves the rest", () => {
    expect(stripSlashTrigger("/web", 0, "web")).toBe("");
    expect(stripSlashTrigger("hello /web", 6, "web")).toBe("hello ");
  });
});

describe("matchesSlashQuery", () => {
  const item = {
    label: "web-search",
    description: "Search the web",
    keywords: ["search"],
  };

  it("matches an empty query", () => {
    expect(matchesSlashQuery(item, "")).toBe(true);
  });

  it("matches label, description, or keywords", () => {
    expect(matchesSlashQuery(item, "web")).toBe(true);
    expect(matchesSlashQuery(item, "Search")).toBe(true);
    expect(matchesSlashQuery(item, "nope")).toBe(false);
  });
});
