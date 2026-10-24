// Mimics an app (Verve's vite-env.d.ts style) that declares the Web Speech API
// as globals with its own event and result shapes, and required constructors
// on Window. The package source must still typecheck alongside it (see
// tsconfig.consumer-speech.json; it cannot share a program with
// window-speech.d.ts, whose Window properties have other types).
declare global {
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((this: SpeechRecognition, event: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, event: Event) => void) | null;
    onend: ((this: SpeechRecognition) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export {};
