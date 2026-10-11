"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, VolumeX, Sparkles } from "lucide-react";
import { useAria, type AriaAvatarState } from "@/components/aria/AriaProvider";

const STATE_CONFIG: Record<AriaAvatarState, { label: string }> = {
  idle: { label: "Ready to start" },
  ready: { label: "Voice ready" },
  speaking: { label: "Aria is speaking" },
  listening: { label: "Listening" },
  processing: { label: "Aria is thinking" },
  error: { label: "Voice needs attention" },
};

export default function AvatarStream({ onEndSession }: { speaking?: boolean; onEndSession?: () => void }) {
  const aria = useAria();
  const speakingNow = aria.avatarState === "speaking";

  return (
    <div className="flex flex-col h-full items-center justify-between py-10 px-6 relative bg-transparent overflow-hidden">
      <div className="text-center">
        <h2 className="font-display font-bold text-[32px] tracking-tight text-text-heading">Aria</h2>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
          Development portrait · browser speech · not a live video stream
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-6 w-full">
        <div
          className="relative overflow-hidden bg-bg-surface border border-border-gold shadow-md"
          style={{ width: "min(320px, 72vw)", height: "min(320px, 72vw)", borderRadius: 24 }}
        >
          <Image
            src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80"
            alt="Development portrait of Aria"
            fill
            className="object-cover opacity-[0.92]"
            priority
          />
          <AnimatePresence>
            {speakingNow && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="absolute pointer-events-none"
                style={{ inset: -8, border: "2px solid var(--border-gold)", borderRadius: 32 }}
              />
            )}
          </AnimatePresence>
        </div>
        <div className="px-5 py-2 rounded-full text-[12px] font-semibold bg-bg-overlay border border-border-subtle text-text-secondary">
          {STATE_CONFIG[aria.avatarState].label}
          {aria.task.kind !== "general" ? ` · ${aria.task.kind}` : ""}
          {aria.task.subject ? ` · ${aria.task.subject.name}` : ""}
        </div>
        <p className="text-[14px] text-center max-w-sm leading-relaxed text-text-secondary font-medium min-h-[42px] whitespace-pre-wrap">
          {aria.caption}
        </p>
        {aria.error && <p className="text-[12px] font-bold text-semantic-error-text text-center max-w-sm">{aria.error}</p>}
      </div>

      <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
        {!aria.active ? (
          <button
            onClick={aria.start}
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-[14px] font-bold text-white"
            style={{ background: "var(--text-gold-deep)" }}
          >
            <Sparkles className="w-4 h-4" />
            Start Voice Session
          </button>
        ) : (
          <>
            <button onClick={aria.avatarState === "listening" ? aria.stopListening : aria.listen} className="px-4 py-3 rounded-xl border border-border-subtle text-[12px] font-bold">
              {aria.avatarState === "listening" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={aria.interrupt} className="px-4 py-3 rounded-xl border border-border-subtle text-[12px] font-bold">
              <VolumeX className="w-4 h-4" />
            </button>
            <button
              onClick={() => { aria.end(); onEndSession?.(); }}
              className="px-4 py-3 rounded-xl border border-semantic-error-border text-[12px] font-bold text-semantic-error"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
