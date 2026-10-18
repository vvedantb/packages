import { describe, expect, it } from "vitest";
import {
  nextReplyChimeState,
  type ReplyChimeInput,
  type ReplyChimeWatch,
} from "./useReplyChime";

function run(inputs: Partial<ReplyChimeInput>[]): boolean[] {
  let state: ReplyChimeWatch | null = null;
  return inputs.map((partial) => {
    const result = nextReplyChimeState(state, {
      enabled: true,
      isStreaming: false,
      threadId: "t1",
      ...partial,
    });
    state = result.next;
    return result.chime;
  });
}

describe("nextReplyChimeState", () => {
  it("chimes on streaming to finished", () => {
    expect(run([{ isStreaming: true }, { isStreaming: false }])).toEqual([false, true]);
  });

  it("is silent on the first observation of a thread", () => {
    expect(run([{ isStreaming: false }])).toEqual([false]);
    expect(run([{ isStreaming: true }])).toEqual([false]);
  });

  it("is silent when a new thread appears mid-stream", () => {
    expect(
      run([
        { threadId: "a", isStreaming: true },
        { threadId: "b", isStreaming: false },
      ]),
    ).toEqual([false, false]);
  });

  it("chimes for the new thread once it has been observed", () => {
    expect(
      run([
        { threadId: "a", isStreaming: false },
        { threadId: "b", isStreaming: true },
        { threadId: "b", isStreaming: false },
      ]),
    ).toEqual([false, false, true]);
  });

  it("chimes once per turn", () => {
    expect(
      run([
        { isStreaming: true },
        { isStreaming: true },
        { isStreaming: false },
        { isStreaming: false },
        { isStreaming: true },
        { isStreaming: false },
      ]),
    ).toEqual([false, false, true, false, false, true]);
  });

  it("does not chime while disabled", () => {
    expect(
      run([
        { enabled: false, isStreaming: true },
        { enabled: false, isStreaming: false },
      ]),
    ).toEqual([false, false]);
  });

  it("does not replay a finish when enabled after the turn ended", () => {
    expect(
      run([
        { enabled: false, isStreaming: true },
        { enabled: false, isStreaming: false },
        { enabled: true, isStreaming: false },
      ]),
    ).toEqual([false, false, false]);
  });

  it("chimes on a later finish after enabling mid-turn", () => {
    expect(
      run([
        { enabled: false, isStreaming: true },
        { enabled: true, isStreaming: true },
        { enabled: true, isStreaming: false },
      ]),
    ).toEqual([false, false, true]);
  });

  it("ignores null and undefined thread ids and resets tracking", () => {
    expect(
      run([
        { threadId: "a", isStreaming: true },
        { threadId: null, isStreaming: false },
        { threadId: "a", isStreaming: false },
        { threadId: undefined, isStreaming: true },
      ]),
    ).toEqual([false, false, false, false]);
  });
});
