"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Pause, Play, RefreshCw, X, Volume2, VolumeX, Sparkles } from "lucide-react";

type AvatarState = "idle" | "speaking" | "listening" | "thinking";

function SpeakingBars({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-end gap-[3px] justify-center">
      {[14, 22, 30, 22, 14].map((maxH, i) => (
        <div
          key={i}
          className="rounded-[1px] bg-text-gold-deep/80"
          style={{
            width: 3,
            height: active ? maxH : 4,
            animation: active ? `soundWave 0.8s ease-in-out ${i * 0.1}s infinite` : "none",
            transition: "height 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [text]);

  return (
    <p className="italic text-[14px] text-center max-w-xs leading-relaxed text-text-secondary font-bold min-h-[42px]">
      {displayed}
      <span className="inline-block w-[2px] h-[14px] ml-1 align-middle bg-text-gold-deep"
        style={{ animation: "blink 1s step-end infinite" }} />
    </p>
  );
}

const STATE_CONFIG: Record<AvatarState, { label: string; color: string; bg: string; border: string }> = {
  idle:      { label: "Ready to start",       color: "var(--text-tertiary)",     bg: "var(--bg-overlay)",         border: "var(--border-subtle)" },
  speaking:  { label: "Aria is speaking…",    color: "var(--color-info-text)",   bg: "var(--color-info-muted)",   border: "var(--color-info-border)" },
  listening: { label: "Listening to you…",    color: "var(--color-error-text)",  bg: "var(--color-error-muted)",  border: "var(--color-error-border)" },
  thinking:  { label: "Aria is thinking…",    color: "var(--color-warning-text)",bg: "var(--color-warning-muted)",border: "var(--color-warning-border)" },
};

const WELCOME = "Hi! I'm Aria, your personal AI mentor. Click the mic and start talking — I'm here to help you learn anything.";

interface AvatarStreamProps {
  speaking?: boolean;
  onEndSession?: () => void;
}

export default function AvatarStream({ onEndSession }: AvatarStreamProps) {
  const [started, setStarted] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [currentText, setCurrentText] = useState("Click Start to begin your voice session with Aria.");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);

  // Keep refs in sync with state (for use inside callbacks)
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  function getSR(): (new () => any) | null {
    if (typeof window === "undefined") return null;
    return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
  }

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();

    if (mutedRef.current) {
      onDone?.();
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.95;
    utter.pitch = 1.05;

    // Try to pick a female voice
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v =>
      v.lang.startsWith("en") && /female|woman|girl|zira|samantha|karen|victoria|moira/i.test(v.name)
    ) ?? voices.find(v => v.lang.startsWith("en")) ?? null;
    if (female) utter.voice = female;

    utter.onstart = () => setAvatarState("speaking");
    utter.onend = () => {
      setAvatarState("idle");
      onDone?.();
    };
    utter.onerror = () => {
      setAvatarState("idle");
      onDone?.();
    };

    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const listenForAnswer = useCallback(() => {
    const SR = getSR();
    if (!SR || pausedRef.current) return;

    setAvatarState("listening");
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = async (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      setCurrentText(`You: "${transcript}"`);
      setAvatarState("thinking");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: transcript }],
            subject: "General Learning",
            level: "intermediate",
            mode: "voice",
          }),
        });
        const data = await res.json();
        const reply: string = data.response ?? "I didn't quite catch that. Could you repeat?";
        setCurrentText(reply);
        speak(reply, () => {
          if (!pausedRef.current) listenForAnswer();
        });
      } catch {
        const fallback = "I had trouble connecting. Please try again.";
        setCurrentText(fallback);
        speak(fallback, () => {
          if (!pausedRef.current) listenForAnswer();
        });
      }
    };

    rec.onerror = () => {
      setAvatarState("idle");
      setCurrentText("Microphone issue. Click the mic button to retry.");
    };

    rec.onend = () => {
      if (avatarState === "listening") setAvatarState("idle");
    };

    recognitionRef.current = rec;
    rec.start();
  }, [speak, avatarState]);

  const handleStart = useCallback(() => {
    setStarted(true);
    setPaused(false);
    setCurrentText(WELCOME);
    // Slight delay so voices are loaded
    setTimeout(() => speak(WELCOME, () => listenForAnswer()), 300);
  }, [speak, listenForAnswer]);

  const handlePause = () => {
    if (!paused) {
      // Pause
      recognitionRef.current?.stop();
      window.speechSynthesis?.pause();
      setPaused(true);
      setAvatarState("idle");
      setCurrentText("Session paused. Click Resume to continue.");
    } else {
      // Resume
      setPaused(false);
      window.speechSynthesis?.resume();
      if (avatarState === "idle") listenForAnswer();
    }
  };

  const handleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) {
      window.speechSynthesis?.cancel();
    }
  };

  const handleRestart = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setStarted(false);
    setPaused(false);
    setAvatarState("idle");
    setCurrentText("Click Start to begin your voice session with Aria.");
  };

  const handleEnd = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setStarted(false);
    setAvatarState("idle");
    onEndSession?.();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const state = STATE_CONFIG[avatarState];
  const isSpeaking = avatarState === "speaking";

  return (
    <div className="flex flex-col h-full items-center justify-between py-10 px-6 relative bg-transparent overflow-hidden">
      {/* Mentor name */}
      <div className="text-center">
        <h2 className="font-display font-bold text-[32px] tracking-tight text-text-heading">Aria</h2>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="px-2 py-0.5 rounded-md bg-gold-500/10 border border-border-gold-faint text-[10px] font-bold text-text-gold-deep uppercase tracking-[0.12em]">
            AI Voice Mentor
          </span>
        </div>
      </div>

      {/* Avatar */}
      <div className="relative flex flex-col items-center gap-6 w-full">
        <div
          className="relative overflow-hidden bg-bg-surface border border-border-gold shadow-md shadow-gold-900/5 transition-all duration-500"
          style={{ width: "min(320px, 72vw)", height: "min(320px, 72vw)", borderRadius: 24 }}
        >
          <Image
            src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80"
            alt="AI Mentor Aria"
            fill
            className="object-cover opacity-[0.92]"
            priority
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, var(--bg-surface) 100%)" }} />

          {/* Pulse ring when speaking */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.05, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute pointer-events-none"
                style={{ inset: -8, border: "2px solid var(--border-gold)", borderRadius: 32 }}
              />
            )}
          </AnimatePresence>

          {/* Listening pulse ring */}
          <AnimatePresence>
            {avatarState === "listening" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.06, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute pointer-events-none"
                style={{ inset: -8, border: "2px solid var(--color-error-border)", borderRadius: 32 }}
              />
            )}
          </AnimatePresence>

          {/* Sound bars */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
            <SpeakingBars active={isSpeaking} />
          </div>
        </div>

        {/* State badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={avatarState}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="px-5 py-2 rounded-full text-[12px] font-semibold tracking-wide flex items-center gap-2 shadow-sm"
            style={{ background: state.bg, border: `1px solid ${state.border}`, color: state.color }}
          >
            {avatarState === "listening" && (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            )}
            {state.label}
          </motion.div>
        </AnimatePresence>

        {/* Current text */}
        <div className="min-h-[56px] flex items-start justify-center px-4 w-full max-w-sm">
          <TypewriterText text={currentText} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
        {!started ? (
          /* ── START button ── */
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-[14px] font-bold text-white shadow-lg transition-all"
            style={{ background: "var(--text-gold-deep)", border: "1px solid var(--border-gold)" }}
          >
            <Sparkles className="w-4 h-4" />
            Start Voice Session
          </motion.button>
        ) : (
          /* ── Session controls ── */
          <>
            {[
              {
                icon: muted ? VolumeX : Volume2,
                label: muted ? "Unmute" : "Mute",
                action: handleMute,
                active: muted,
                danger: false,
              },
              {
                icon: avatarState === "listening" ? MicOff : Mic,
                label: avatarState === "listening" ? "Stop Mic" : "Speak",
                action: () => {
                  if (avatarState === "listening") {
                    recognitionRef.current?.stop();
                    setAvatarState("idle");
                  } else if (avatarState === "idle" && !paused) {
                    listenForAnswer();
                  }
                },
                active: avatarState === "listening",
                danger: false,
              },
              {
                icon: paused ? Play : Pause,
                label: paused ? "Resume" : "Pause",
                action: handlePause,
                active: paused,
                danger: false,
              },
              {
                icon: RefreshCw,
                label: "Restart",
                action: handleRestart,
                active: false,
                danger: false,
              },
              {
                icon: X,
                label: "End",
                action: handleEnd,
                active: false,
                danger: true,
              },
            ].map(({ icon: Icon, label, action, active, danger }) => (
              <button
                key={label}
                onClick={action}
                title={label}
                className="flex flex-col items-center gap-1.5 w-[66px] py-3 rounded-xl transition-all duration-200 group"
                style={{
                  background: active ? "var(--text-gold-deep)" : "var(--bg-surface)",
                  border: active
                    ? "1px solid var(--border-gold)"
                    : danger
                    ? "1px solid var(--color-error-border)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    active ? "text-white" : danger ? "text-semantic-error" : "text-text-tertiary group-hover:text-text-secondary"
                  }`}
                  strokeWidth={active || danger ? 2 : 1.5}
                />
                <span className={`text-[10px] font-bold tracking-tight ${
                  active ? "text-white" : danger ? "text-semantic-error" : "text-text-tertiary group-hover:text-text-secondary"
                }`}>{label}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
