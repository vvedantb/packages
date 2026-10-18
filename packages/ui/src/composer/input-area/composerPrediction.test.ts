import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ghostSuggestion,
  scheduleCompletion,
  shouldSkipPrediction,
} from "./composerPrediction";

describe("shouldSkipPrediction", () => {
  it("skips short drafts", () => {
    expect(shouldSkipPrediction("hello")).toBe(true);
    expect(shouldSkipPrediction("   hello      ")).toBe(true);
  });
  it("skips in-progress slash and mention tokens", () => {
    expect(shouldSkipPrediction("please look at /sk")).toBe(true);
    expect(shouldSkipPrediction("please ask @som")).toBe(true);
  });
  it("skips text ending in sentence punctuation", () => {
    expect(shouldSkipPrediction("this is finished.")).toBe(true);
    expect(shouldSkipPrediction("is this finished? ")).toBe(true);
  });
  it("allows a long open draft", () => {
    expect(shouldSkipPrediction("please summarise the")).toBe(false);
  });
});

describe("ghostSuggestion", () => {
  it("adds a joining space", () => {
    expect(ghostSuggestion("write the", "report")).toBe(" report");
  });
  it("does not double the space", () => {
    expect(ghostSuggestion("write the ", "report")).toBe("report");
    expect(ghostSuggestion("write the", " report")).toBe(" report");
  });
});

describe("scheduleCompletion", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls the action only after the idle delay", async () => {
    const complete = vi.fn().mockResolvedValue("done");
    const onResult = vi.fn();
    scheduleCompletion("draft text here", complete, onResult);
    await vi.advanceTimersByTimeAsync(499);
    expect(complete).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(complete).toHaveBeenCalledWith("draft text here");
    expect(onResult).toHaveBeenCalledWith("done");
  });

  it("cancels on change", async () => {
    const complete = vi.fn().mockResolvedValue("done");
    const onResult = vi.fn();
    const cancel = scheduleCompletion("draft text here", complete, onResult);
    cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(complete).not.toHaveBeenCalled();
  });

  it("drops a reply that arrives after cancel", async () => {
    let resolve: (text: string) => void = () => undefined;
    const complete = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const onResult = vi.fn();
    const cancel = scheduleCompletion("draft text here", complete, onResult);
    await vi.advanceTimersByTimeAsync(500);
    cancel();
    resolve("late");
    await vi.advanceTimersByTimeAsync(0);
    expect(onResult).not.toHaveBeenCalled();
  });

  it("ignores empty completions", async () => {
    const onResult = vi.fn();
    scheduleCompletion("draft text here", () => Promise.resolve(""), onResult);
    await vi.advanceTimersByTimeAsync(500);
    expect(onResult).not.toHaveBeenCalled();
  });
});
