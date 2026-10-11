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
  inputModality: "speech" | "text";
  body: Record<string, unknown>;
};

type Handler = (turn: AriaTurn) => void;

type AriaValue = {
  avatarState: AriaAvatarState;
  caption: string;
  error: string;
  active: boolean;
  providerConfigured: boolean;
  realtimeWebrtc: boolean;
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
  sendText: (text: string) => void;
  resetConversation: () => void;
  registerHandler: (handler: Handler) => () => void;
};

const AriaContext = createContext<AriaValue | null>(null);

type BrowserSpeechAlternative = { transcript: string };
type BrowserSpeechResult = { 0: BrowserSpeechAlternative; isFinal: boolean };
type BrowserSpeechEvent = {
  results: ArrayLike<BrowserSpeechResult> & { length: number; [index: number]: BrowserSpeechResult };
};
type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type BrowserSpeechConstructor = new () => BrowserSpeechRecognition;

function speechRecognition(): BrowserSpeechConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechConstructor;
    webkitSpeechRecognition?: BrowserSpeechConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function AriaProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const [avatarState, setAvatarState] = useState<AriaAvatarState>("idle");
  const [caption, setCaption] = useState("Start a voice session to speak with Aria.");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [task, setTaskState] = useState<AriaTask>({ kind: "general" });
  const taskRef = useRef(task);
  const activeRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const handlersRef = useRef(new Set<Handler>());
  const tokenRef = useRef(token);
  const listenRef = useRef<() => void>(() => {});
  const conversationRef = useRef<string | null>(null);
  const generalSubjectRef = useRef("");
  const requestRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const speechSequenceRef = useRef(0);
  const transcriptRef = useRef({ text: "", at: 0 });

  useEffect(() => { taskRef.current = task; }, [task]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { activeRef.current = active; }, [active]);

  const cancelRuntime = useCallback(() => {
    requestSequenceRef.current += 1;
    speechSequenceRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setAvatarState(activeRef.current ? "ready" : "idle");
  }, []);

  const setTask = useCallback((next: AriaTask) => {
    const current = taskRef.current;
    const changed =
      current.kind !== next.kind ||
      current.subject !== next.subject ||
      current.learningSessionId !== next.learningSessionId ||
      current.interviewSessionId !== next.interviewSessionId;
    if (changed) cancelRuntime();
    if (next.kind === "general") {
      const subject = next.subject ?? "";
      if (generalSubjectRef.current && generalSubjectRef.current !== subject) {
        conversationRef.current = null;
      }
      generalSubjectRef.current = subject;
    }
    taskRef.current = next;
    setTaskState(next);
  }, [cancelRuntime]);

  const resetConversation = useCallback(() => {
    cancelRuntime();
    conversationRef.current = null;
  }, [cancelRuntime]);

  const clearTask = useCallback((kind: AriaKind) => {
    if (taskRef.current.kind !== kind) return;
    cancelRuntime();
    const next: AriaTask = {
      kind: "general",
      subject: generalSubjectRef.current || undefined,
    };
    taskRef.current = next;
    setTaskState(next);
  }, [cancelRuntime]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setAvatarState((current) => (current === "listening" ? "ready" : current));
  }, []);

  const interrupt = useCallback(() => {
    cancelRuntime();
  }, [cancelRuntime]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !text.trim()) return;
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setCaption(text);
      setAvatarState(activeRef.current ? "ready" : "idle");
      setError("Speech playback is unavailable in this browser. The response is shown as text.");
      return;
    }
    const speechSequence = ++speechSequenceRef.current;
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.95;
    utter.onstart = () => {
      if (speechSequence === speechSequenceRef.current) setAvatarState("speaking");
    };
    utter.onend = () => {
      if (speechSequence !== speechSequenceRef.current) return;
      setAvatarState("ready");
      if (activeRef.current) listenRef.current();
    };
    utter.onerror = () => {
      if (speechSequence !== speechSequenceRef.current) return;
      setAvatarState(activeRef.current ? "ready" : "idle");
      setError("Speech playback stopped. The response remains available as text.");
    };
    setCaption(text);
    window.speechSynthesis.speak(utter);
  }, []);

  const submit = useCallback(async (heard: string, inputModality: "speech" | "text") => {
    const current = taskRef.current;
    const access = tokenRef.current;
    const sequence = ++requestSequenceRef.current;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setAvatarState("processing");
    setCaption(`You: ${heard}`);
    const publishFailure = (message: string, body: Record<string, unknown>) => {
      handlersRef.current.forEach((handler) => handler({
        context: current.kind,
        heard,
        spokenText: null,
        ok: false,
        inputModality,
        body,
      }));
      setAvatarState("error");
      setError(message);
      setCaption(message);
    };
    if (!access) {
      requestRef.current = null;
      publishFailure(
        "Sign in before speaking with Aria.",
        { error: "authentication_required", message: "Sign in before speaking with Aria." },
      );
      return;
    }
    const body: Record<string, string> = {
      context: current.kind,
      content: heard,
      client_turn_id: crypto.randomUUID(),
      input_modality: inputModality,
    };
    if (current.learningSessionId) body.learning_session_id = current.learningSessionId;
    if (current.interviewSessionId) body.interview_session_id = current.interviewSessionId;
    if (current.subject) body.subject = current.subject;
    if (current.kind === "general" && conversationRef.current) {
      body.conversation_id = conversationRef.current;
    }
    try {
      const endpoint = current.kind === "general" ? "/api/v1/voice/general-stream/" : "/api/v1/voice/turns/";
      const res = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (current.kind === "general" && res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedText = "";
        let streamCompleted = false;
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
            if (!dataLine) continue;
            const event = JSON.parse(dataLine.slice(5));
            if (sequence !== requestSequenceRef.current) {
              await reader.cancel();
              return;
            }
            if (event.type === "conversation" && typeof event.conversation_id === "string") {
              conversationRef.current = event.conversation_id;
            } else if (event.type === "delta" && typeof event.text === "string") {
              streamedText += event.text;
              setCaption(streamedText);
            } else if (event.type === "error") {
              const message = typeof event.message === "string" ? event.message : "Aria could not answer this turn.";
              publishFailure(message, event);
              return;
            } else if (event.type === "done" && event.payload) {
              streamCompleted = true;
              const payload = event.payload as Record<string, unknown>;
              if (typeof payload.conversation_id === "string") {
                conversationRef.current = payload.conversation_id;
              }
              const spoken = typeof payload.spoken_text === "string" ? payload.spoken_text : streamedText || null;
              handlersRef.current.forEach((handler) => handler({
                context: "general",
                heard,
                spokenText: spoken,
                ok: true,
                inputModality,
                body: payload,
              }));
              setError("");
              if (activeRef.current && spoken) speak(spoken);
              else setAvatarState("idle");
            }
          }
          if (done) break;
        }
        if (!streamCompleted && sequence === requestSequenceRef.current) {
          publishFailure(
            "The AI response stream ended before completion.",
            {
              error: "incomplete_stream",
              message: "The AI response stream ended before completion.",
            },
          );
        }
        return;
      }
      const payload = await res.json();
      if (sequence !== requestSequenceRef.current) return;
      if (current.kind === "general" && typeof payload.conversation_id === "string") {
        conversationRef.current = payload.conversation_id;
      }
      const spoken = typeof payload.spoken_text === "string" ? payload.spoken_text : null;
      const turn: AriaTurn = {
        context: current.kind,
        heard,
        spokenText: spoken,
        ok: res.ok,
        inputModality,
        body: payload,
      };
      handlersRef.current.forEach((handler) => handler(turn));
      if (!res.ok || !spoken) {
        setAvatarState("error");
        setError(payload.message ?? "Aria could not answer this turn.");
        setCaption(payload.message ?? "Aria could not answer this turn.");
        return;
      }
      setError("");
      if (activeRef.current) speak(spoken);
      else setAvatarState("idle");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      if (sequence !== requestSequenceRef.current) return;
      publishFailure(
        "The voice turn could not reach Virtuara.",
        {
          error: "voice_transport_unavailable",
          message: "The voice turn could not reach Virtuara.",
        },
      );
    } finally {
      if (sequence === requestSequenceRef.current) requestRef.current = null;
    }
  }, [speak]);

  const sendText = useCallback((text: string) => {
    const normalized = text.trim();
    if (normalized) void submit(normalized, "text");
  }, [submit]);

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
    rec.onresult = (event: BrowserSpeechEvent) => {
      const piece = Array.from(event.results).map((item) => item[0].transcript).join("");
      setCaption(piece);
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const normalized = piece.trim().toLowerCase();
        const now = Date.now();
        if (normalized && transcriptRef.current.text === normalized && now - transcriptRef.current.at < 1500) {
          return;
        }
        transcriptRef.current = { text: normalized, at: now };
        setAvatarState("processing");
        void submit(piece.trim(), "speech");
      }
    };
    rec.onerror = (event: { error?: string }) => {
      const denied = event?.error === "not-allowed" || event?.error === "service-not-allowed";
      setAvatarState("error");
      setError(denied ? "Microphone permission was denied." : "The microphone stopped. You can try again or type.");
    };
    rec.onend = () => {
      if (recognitionRef.current !== rec) return;
      recognitionRef.current = null;
      setAvatarState((current) => (
        current === "listening" ? (activeRef.current ? "ready" : "idle") : current
      ));
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      setAvatarState("error");
      setError("The microphone could not start. Try again or type your message.");
    }
  }, [submit]);

  useEffect(() => { listenRef.current = listen; }, [listen]);

  useEffect(() => {
    if (!token) {
      setProviderConfigured(false);
      return;
    }
    const controller = new AbortController();
    fetch(`${BASE}/api/v1/voice/status/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload) => setProviderConfigured(Boolean(payload.text_provider_configured)))
      .catch(() => setProviderConfigured(false));
    return () => controller.abort();
  }, [token]);

  const start = useCallback(() => {
    setActive(true);
    activeRef.current = true;
    setError("");
    setAvatarState("ready");
    setCaption("Starting browser speech. This is not a live video stream.");
    listen();
  }, [listen]);

  const end = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    cancelRuntime();
    setAvatarState("idle");
    setCaption("Voice session ended.");
  }, [cancelRuntime]);

  useEffect(() => {
    if (!token && activeRef.current) end();
  }, [token, end]);

  useEffect(() => () => {
    requestSequenceRef.current += 1;
    speechSequenceRef.current += 1;
    requestRef.current?.abort();
    recognitionRef.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const registerHandler = useCallback((handler: Handler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  const value = useMemo<AriaValue>(() => ({
    avatarState, caption, error, active, providerConfigured, task,
    realtimeWebrtc: false,
    liveAvatarStream: false,
    transport: "browser_speech_api",
    setTask, clearTask, start, end, listen, stopListening, interrupt, speak,
    sendText, resetConversation, registerHandler,
  }), [
    avatarState, caption, error, active, providerConfigured, task, setTask, clearTask,
    start, end, listen, stopListening, interrupt, speak, sendText, resetConversation, registerHandler,
  ]);

  return <AriaContext.Provider value={value}>{children}</AriaContext.Provider>;
}

export function useAria() {
  const value = useContext(AriaContext);
  if (!value) throw new Error("useAria must be used inside AriaProvider");
  return value;
}
