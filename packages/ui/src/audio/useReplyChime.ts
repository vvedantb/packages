import { useEffect, useRef } from "react";
import { playChime } from "./playChime";

export type ReplyChimeWatch = {
  threadId: string;
  wasStreaming: boolean;
};

export type ReplyChimeInput = {
  enabled: boolean;
  isStreaming: boolean;
  threadId: string | null | undefined;
};

/**
 * Pure transition for the reply chime. Returns the state to remember and
 * whether to chime.
 *
 * - No thread id: reset tracking and stay silent.
 * - First observation of a thread (or a new thread): silent.
 * - Chime only on streaming to finished for the same thread, while enabled.
 * - The edge is tracked while disabled, so enabling mid-turn does not replay
 *   a finish that already happened.
 */
export function nextReplyChimeState(
  previous: ReplyChimeWatch | null,
  { enabled, isStreaming, threadId }: ReplyChimeInput,
): { next: ReplyChimeWatch | null; chime: boolean } {
  if (threadId == null || threadId === "") {
    return { next: null, chime: false };
  }
  const next = { threadId, wasStreaming: isStreaming };
  if (!previous || previous.threadId !== threadId) {
    return { next, chime: false };
  }
  const finished = previous.wasStreaming && !isStreaming;
  return { next, chime: finished && enabled };
}

/**
 * Plays the reply chime once when a thread finishes streaming.
 *
 * Silent on the first observation of a thread, so opening a settled thread
 * does not chime for an earlier turn.
 */
export function useReplyChime({
  enabled,
  isStreaming,
  threadId,
}: ReplyChimeInput): void {
  const watchedRef = useRef<ReplyChimeWatch | null>(null);

  useEffect(() => {
    const { next, chime } = nextReplyChimeState(watchedRef.current, {
      enabled,
      isStreaming,
      threadId,
    });
    watchedRef.current = next;
    if (chime) playChime();
  }, [enabled, isStreaming, threadId]);
}
