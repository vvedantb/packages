type Tone = {
  frequency: number;
  startOffsetS: number;
  durationS: number;
  peakGain: number;
};

/** A soft rising interval (A5 then D6). The second note overlaps the first. */
const REPLY_CHIME: readonly Tone[] = [
  { frequency: 880, startOffsetS: 0, durationS: 0.28, peakGain: 0.14 },
  { frequency: 1174.66, startOffsetS: 0.09, durationS: 0.28, peakGain: 0.14 },
];

/** Long enough to avoid a click on attack. */
const ATTACK_S = 0.012;

/** Calls closer together than this are dropped, so overlapping events sound once. */
const MIN_INTERVAL_S = 1;

let sharedContext: AudioContext | null = null;
let lastPlayedAtS: number | null = null;

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
 * Plays a soft rising two-note chime with WebAudio.
 *
 * The context is created on first use and shared. The call is a no-op on the
 * server, without WebAudio, or while autoplay policy blocks audio.
 */
export function playChime(): void {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    try {
      context.resume().catch(() => undefined);
    } catch {
      return;
    }
  }

  const start = context.currentTime;
  if (lastPlayedAtS !== null && start - lastPlayedAtS < MIN_INTERVAL_S) return;
  lastPlayedAtS = start;

  try {
    for (const tone of REPLY_CHIME) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone.frequency;

      const toneStart = start + tone.startOffsetS;
      const toneEnd = toneStart + tone.durationS;
      envelope.gain.setValueAtTime(0, toneStart);
      envelope.gain.linearRampToValueAtTime(tone.peakGain, toneStart + ATTACK_S);
      envelope.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

      oscillator.connect(envelope).connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneEnd);
    }
  } catch {
    // Audio is optional. Stay silent on any failure.
  }
}
