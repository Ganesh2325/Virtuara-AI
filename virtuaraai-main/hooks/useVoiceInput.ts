"use client";

import { useState, useRef, useCallback } from "react";

type VoiceState = "idle" | "listening" | "processing";

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setState("listening");
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setState("processing");
      onTranscript(transcript);
      setTimeout(() => setState("idle"), 500);
    };
    recognition.onerror = () => setState("idle");
    recognition.onend = () => setState((prev) => (prev === "listening" ? "idle" : prev));

    recognition.start();
    recognitionRef.current = recognition;
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  const toggle = useCallback(() => {
    if (state === "listening") stopListening();
    else startListening();
  }, [state, startListening, stopListening]);

  return { state, toggle, startListening, stopListening };
}
