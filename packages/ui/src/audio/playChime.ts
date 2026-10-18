import { playTone, type Tone } from "./playTone";

/** A soft rising interval (A5 then D6). The second note overlaps the first. */
const REPLY_CHIME: readonly Tone[] = [
  { frequency: 880, startOffsetS: 0, durationS: 0.28, peakGain: 0.14 },
  { frequency: 1174.66, startOffsetS: 0.09, durationS: 0.28, peakGain: 0.14 },
];

/**
 * Plays a soft rising two-note chime with WebAudio.
 *
 * The context is created on first use and shared. The call is a no-op on the
 * server, without WebAudio, or while autoplay policy blocks audio. It shares
 * the 1 second floor with every other package sound.
 */
export function playChime(): void {
  playTone(REPLY_CHIME);
}
