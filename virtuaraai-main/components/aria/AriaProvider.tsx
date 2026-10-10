"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AriaKind = "general" | "learning" | "quiz" | "interview";
export type AriaAvatarState = "idle" | "ready" | "listening" | "processing" | "speaking" | "error";

export type AriaTask = {
  kind: AriaKind;
  subject?: string;
  learningSessionId?: string | null;
  interviewSessionId?: string | null;
};

export type AriaTurn = {
  context: AriaKind;
  heard: string;
  spokenText: string | null;
  ok: boolean;
  body: Record<string, unknown>;
};

type Handler = (turn: AriaTurn) => void;

type AriaValue = {
  avatarState: AriaAvatarState;
  caption: string;
  error: string;
  active: boolean;
  realtimeWebrtc: false;
  liveAvatarStream: false;
  transport: "browser_speech_api";
  task: AriaTask;
  setTask: (task: AriaTask) => void;
  clearTask: (kind: AriaKind) => void;
  start: () => void;
  end: () => void;
  listen: () => void;
  stopListening: () => void;
  interrupt: () => void;
  speak: (text: string) => void;
  registerHandler: (handler: Handler) => () => void;
};

const AriaContext = createContext<AriaValue | null>(null);

function speechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

export function AriaProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const [avatarState, setAvatarState] = useState<AriaAvatarState>("idle");
  const [caption, setCaption] = useState("Start a voice session to speak with Aria.");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [task, setTaskState] = useState<AriaTask>({ kind: "general" });
  const taskRef = useRef(task);
  const activeRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef(new Set<Handler>());
  const tokenRef = useRef(token);
  const listenRef = useRef<() => void>(() => {});

  useEffect(() => { taskRef.current = task; }, [task]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { activeRef.current = active; }, [active]);

  const setTask = useCallback((next: AriaTask) => {
    taskRef.current = next;
    setTaskState(next);
  }, []);

  const clearTask = useCallback((kind: AriaKind) => {
    if (taskRef.current.kind !== kind) return;
    const next = { kind: "general" as const };
    taskRef.current = next;
    setTaskState(next);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setAvatarState((current) => (current === "listening" ? "ready" : current));
  }, []);

  const interrupt = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    stopListening();
    setAvatarState(activeRef.current ? "ready" : "idle");
  }, [stopListening]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !text.trim()) return;
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.95;
    utter.onstart = () => setAvatarState("speaking");
    utter.onend = () => {
      setAvatarState("ready");
      if (activeRef.current) listenRef.current();
    };
    utter.onerror = () => setAvatarState("ready");
    setCaption(text);
    window.speechSynthesis.speak(utter);
  }, []);

  const submit = useCallback(async (heard: string) => {
    const current = taskRef.current;
    const access = tokenRef.current;
    setAvatarState("processing");
    setCaption(`You: ${heard}`);
    if (!access) {
      setAvatarState("error");
      setError("Sign in before speaking with Aria.");
      return;
    }
    const body: Record<string, string> = {
      context: current.kind,
      content: heard,
      client_turn_id: crypto.randomUUID(),
    };
    if (current.learningSessionId) body.learning_session_id = current.learningSessionId;
    if (current.interviewSessionId) body.interview_session_id = current.interviewSessionId;
    try {
      const res = await fetch(`${BASE}/api/v1/voice/turns/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      const spoken = typeof payload.spoken_text === "string" ? payload.spoken_text : null;
      const turn: AriaTurn = { context: current.kind, heard, spokenText: spoken, ok: res.ok, body: payload };
      handlersRef.current.forEach((handler) => handler(turn));
      if (!res.ok || !spoken) {
        setAvatarState("error");
        setError(payload.message ?? "Aria could not answer this turn.");
        setCaption(payload.message ?? "Aria could not answer this turn.");
        return;
      }
      setError("");
      speak(spoken);
    } catch {
      setAvatarState("error");
      setError("The voice turn could not reach Virtuara.");
    }
  }, [speak]);

  const listen = useCallback(() => {
    const Recognition = speechRecognition();
    if (!Recognition) {
      setAvatarState("error");
      setError("This browser has no speech recognition. Type your message instead.");
      return;
    }
    recognitionRef.current?.stop();
    const rec = new Recognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => {
      setAvatarState("listening");
      setError("");
    };
    rec.onresult = (event: any) => {
      const piece = Array.from(event.results as any[]).map((item: any) => item[0].transcript).join("");
      setCaption(piece);
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        setAvatarState("processing");
        void submit(piece.trim());
      }
    };
    rec.onerror = (event: any) => {
      const denied = event?.error === "not-allowed" || event?.error === "service-not-allowed";
      setAvatarState("error");
      setError(denied ? "Microphone permission was denied." : "The microphone stopped. You can try again or type.");
    };
    recognitionRef.current = rec;
    rec.start();
  }, [submit]);

  useEffect(() => { listenRef.current = listen; }, [listen]);

  const start = useCallback(() => {
    setActive(true);
    activeRef.current = true;
    setError("");
    setAvatarState("ready");
    setCaption("Voice session ready. Browser speech is on. This is not a live video stream.");
    listen();
  }, [listen]);

  const end = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    recognitionRef.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setAvatarState("idle");
    setCaption("Voice session ended.");
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const registerHandler = useCallback((handler: Handler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  const value = useMemo<AriaValue>(() => ({
    avatarState, caption, error, active, task,
    realtimeWebrtc: false,
    liveAvatarStream: false,
    transport: "browser_speech_api",
    setTask, clearTask, start, end, listen, stopListening, interrupt, speak, registerHandler,
  }), [avatarState, caption, error, active, task, setTask, clearTask, start, end, listen, stopListening, interrupt, speak, registerHandler]);

  return <AriaContext.Provider value={value}>{children}</AriaContext.Provider>;
}

export function useAria() {
  const value = useContext(AriaContext);
  if (!value) throw new Error("useAria must be used inside AriaProvider");
  return value;
}
