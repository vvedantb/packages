import { tryAcquireAudioFloor } from "./audioFloor";

export type Tone = {
  /** Pitch in Hz. */
  frequency: number;
  /** Delay from the start of the call, in seconds. Default 0. */
  startOffsetS?: number;
  /** Length in seconds. Default 0.28. */
  durationS?: number;
  /** Peak gain from 0 to 1. Default 0.14. */
  peakGain?: number;
  /** Default "sine". */
  type?: OscillatorType;
};

/** Long enough to avoid a click on attack. */
const ATTACK_S = 0.012;

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  if (typeof window === "undefined" || !window.AudioContext) return null;
  try {
    sharedContext = new window.AudioContext();
  } catch {
    return null;
  }
  return sharedContext;
}

/**
 * Plays one tone or a sequence of overlapping tones with WebAudio, through the
 * shared 1 second floor (see `tryAcquireAudioFloor`). The context is created on
 * first use and shared. The call is a no-op on the server, without WebAudio,
 * or while autoplay policy blocks audio.
 */
export function playTone(tones: Tone | readonly Tone[]): void {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    try {
      context.resume().catch(() => undefined);
    } catch {
      return;
    }
  }

  if (!tryAcquireAudioFloor()) return;

  try {
    const start = context.currentTime;
    for (const tone of Array.isArray(tones) ? tones : [tones as Tone]) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = tone.type ?? "sine";
      oscillator.frequency.value = tone.frequency;

      const toneStart = start + (tone.startOffsetS ?? 0);
      const toneEnd = toneStart + (tone.durationS ?? 0.28);
      envelope.gain.setValueAtTime(0, toneStart);
      envelope.gain.linearRampToValueAtTime(tone.peakGain ?? 0.14, toneStart + ATTACK_S);
      envelope.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

      oscillator.connect(envelope).connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneEnd);
    }
  } catch {
    // Audio is optional. Stay silent on any failure.
  }
}
