import { describe, expect, it } from "vitest";

import {
  acceptComposerPrediction,
  initialComposerPredictionState,
  joinComposerPrediction,
  nextComposerPredictionState,
  shouldSkipComposerPrediction,
  visibleComposerPrediction,
} from "./prediction";

describe("shouldSkipComposerPrediction", () => {
  it("skips drafts under the minimum length, trimmed", () => {
    expect(shouldSkipComposerPrediction("short", 12)).toBe(true);
    expect(shouldSkipComposerPrediction("   short   ", 12)).toBe(true);
    expect(shouldSkipComposerPrediction("a draft that is long", 12)).toBe(false);
  });

  it("honours a custom minimum", () => {
    expect(shouldSkipComposerPrediction("hello there", 5)).toBe(false);
    expect(shouldSkipComposerPrediction("hello there", 40)).toBe(true);
  });

  it("skips when the last word starts with @ or /", () => {
    expect(shouldSkipComposerPrediction("please ask @dana", 12)).toBe(true);
    expect(shouldSkipComposerPrediction("please run /deploy", 12)).toBe(true);
    expect(shouldSkipComposerPrediction("please ask @dana about it", 12)).toBe(false);
  });

  it("skips finished sentences", () => {
    expect(shouldSkipComposerPrediction("This is finished.", 12)).toBe(true);
    expect(shouldSkipComposerPrediction("Is this finished? ", 12)).toBe(true);
    expect(shouldSkipComposerPrediction("Really, it is done!\n", 12)).toBe(true);
    expect(shouldSkipComposerPrediction("This is not finished", 12)).toBe(false);
  });
});

describe("joinComposerPrediction", () => {
  it("adds a space when neither side has whitespace", () => {
    expect(joinComposerPrediction("hello", "world")).toBe(" world");
  });
  it("adds no space when the draft ends with whitespace or the text starts with it", () => {
    expect(joinComposerPrediction("hello ", "world")).toBe("world");
    expect(joinComposerPrediction("hello", " world")).toBe(" world");
  });
  it("returns an empty string for an empty prediction", () => {
    expect(joinComposerPrediction("hello", "")).toBe("");
  });
});

describe("nextComposerPredictionState", () => {
  const draft = "a draft long enough";

  it("stores a result for the current draft", () => {
    const next = nextComposerPredictionState(initialComposerPredictionState, {
      type: "result",
      forValue: draft,
      text: "to finish",
      current: draft,
    });
    expect(visibleComposerPrediction(next, draft)).toBe(" to finish");
  });

  it("drops a result when the draft moved on", () => {
    const next = nextComposerPredictionState(initialComposerPredictionState, {
      type: "result",
      forValue: draft,
      text: "to finish",
      current: `${draft} x`,
    });
    expect(next).toBe(initialComposerPredictionState);
  });

  it("drops an empty result", () => {
    const next = nextComposerPredictionState(initialComposerPredictionState, {
      type: "result",
      forValue: draft,
      text: "",
      current: draft,
    });
    expect(next).toBe(initialComposerPredictionState);
  });

  it("hides the prediction for another draft", () => {
    const state = nextComposerPredictionState(initialComposerPredictionState, {
      type: "result",
      forValue: draft,
      text: "to finish",
      current: draft,
    });
    expect(visibleComposerPrediction(state, `${draft}!`)).toBe("");
  });

  it("dismisses for the current draft only", () => {
    const state = nextComposerPredictionState(initialComposerPredictionState, {
      type: "dismiss",
      value: draft,
    });
    expect(state.dismissedFor).toBe(draft);
    const withResult = nextComposerPredictionState(state, {
      type: "result",
      forValue: draft,
      text: "to finish",
      current: draft,
    });
    expect(visibleComposerPrediction(withResult, draft)).toBe("");
  });

  it("clears the text but keeps the dismissed draft", () => {
    const state = nextComposerPredictionState(
      { forValue: draft, text: "x", dismissedFor: "other" },
      { type: "clear" },
    );
    expect(state).toEqual({ forValue: null, text: "", dismissedFor: "other" });
  });

  it("shows nothing when the draft is now skipped", () => {
    const state = { forValue: "Done.", text: "more", dismissedFor: null };
    expect(visibleComposerPrediction(state, "Done.", 2)).toBe("");
  });
});

describe("acceptComposerPrediction", () => {
  it("appends the ghost text", () => {
    expect(acceptComposerPrediction("hello", " world")).toBe("hello world");
  });
});
