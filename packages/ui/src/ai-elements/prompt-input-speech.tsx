"use client";

import { useEffect, useRef, useState } from "react";
import { IconMicrophone, IconPlayerStop } from "@tabler/icons-react";
import { PromptInputButton } from "./prompt-input";

// Web Speech API dictation for the prompt input: `useSpeechRecognition` streams
// the transcript (prefix + finals + interim) to a callback, and
// `PromptInputSpeech` is a microphone button that writes it into the form's
// `textarea[name="message"]`.

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

// Read the constructors through a local type: a package must not augment the
// global Window.
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/** The browser's `SpeechRecognition` constructor, or `null` without one. */
export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow: SpeechRecognitionWindow = window;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

/**
 * Continuous dictation. `toggle(prefix)` starts listening (or stops); each
 * result calls `onUpdate` with `prefix` plus the transcript so far.
 */
export function useSpeechRecognition(onUpdate: (fullText: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const prefixRef = useRef("");

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const start = (prefix: string) => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const separator = prefix && !prefix.endsWith(" ") ? " " : "";
    prefixRef.current = prefix + separator;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finals += text;
        } else {
          interim += text;
        }
      }
      onUpdateRef.current(prefixRef.current + finals + interim);
    };

    recognition.onerror = () => {
      stop();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const toggle = (prefix: string) => {
    if (isListening) {
      stop();
    } else {
      start(prefix);
    }
  };

  // Stop listening on unmount.
  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    },
    [],
  );

  return { isListening, toggle };
}

export interface PromptInputSpeechProps {
  disabled?: boolean;
}

/** Microphone button for the prompt input. Renders nothing without the Web Speech API. */
export function PromptInputSpeech({ disabled }: PromptInputSpeechProps) {
  if (!getSpeechRecognition()) return null;

  return <SpeechButton disabled={disabled} />;
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (!setter) return;
  setter.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function SpeechButton({ disabled }: PromptInputSpeechProps) {
  const { isListening, toggle } = useSpeechRecognition((fullText) => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="message"]',
    );
    if (!textarea) return;
    setTextareaValue(textarea, fullText);
    textarea.focus();
  });

  const handleToggle = () => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="message"]',
    );
    toggle(textarea?.value ?? "");
  };

  return (
    <PromptInputButton
      tooltip={isListening ? "Stop recording" : "Voice input"}
      onClick={handleToggle}
      disabled={disabled}
      className={isListening ? "text-destructive" : ""}
    >
      {isListening ? (
        <IconPlayerStop className="size-4" />
      ) : (
        <IconMicrophone className="size-4" />
      )}
    </PromptInputButton>
  );
}
