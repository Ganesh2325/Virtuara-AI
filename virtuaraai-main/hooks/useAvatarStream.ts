"use client";

import { useState, useCallback } from "react";
import { AvatarState } from "@/types";

export function useAvatarStream() {
  const [speaking, setSpeaking] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [currentText, setCurrentText] = useState("");

  const startSpeaking = useCallback((text: string) => {
    setSpeaking(true);
    setAvatarState("explaining");
    setCurrentText(text);
  }, []);

  const stopSpeaking = useCallback(() => {
    setSpeaking(false);
    setAvatarState("waiting");
    setCurrentText("");
  }, []);

  const setWaiting = useCallback(() => {
    setSpeaking(false);
    setAvatarState("waiting");
  }, []);

  return { speaking, avatarState, currentText, startSpeaking, stopSpeaking, setWaiting };
}
