"use client";

import { motion } from "framer-motion";
import { X, Clock, MessageSquare, CheckCircle2, Brain, ArrowRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import GlowButton from "@/components/shared/GlowButton";

interface SessionSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function SessionSummary({ isOpen, onClose, userName = "Learner" }: SessionSummaryProps) {
  const router = useRouter();
  const [xp, setXp] = useState(0);
  const targetXp = 240;
  const duration = 1200; // 1.2s
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const animateXp = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const progress = Math.min((time - startTimeRef.current) / duration, 1);
    setXp(Math.floor(progress * targetXp));
    if (progress < 1) {
      requestRef.current = requestAnimationFrame(animateXp);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setXp(0);
      startTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animateXp);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-bg-page/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-bg-elevated border border-border-subtle rounded-[32px] shadow-2xl overflow-hidden p-10 flex flex-col items-center text-center"
      >
        {/* Confetti shower */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="confetti absolute top-0"
              style={{
                left: `${Math.random() * 100}%`,
                width: "8px",
                height: "8px",
                backgroundColor: i % 4 === 0 ? "var(--text-gold)" : i % 4 === 1 ? "var(--text-gold-deep)" : i % 4 === 2 ? "var(--color-success)" : "#A1A1AA",
                animation: `confettiFall ${1.5 + Math.random()}s linear ${Math.random() * 0.8}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <header className="mb-8 relative z-10">
          <h2 className="font-display font-semibold text-[36px] text-text-heading leading-tight mb-2">
            Great Session, {userName}!
          </h2>
          <p className="text-text-secondary text-[15px] font-light">Here's what you accomplished today.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full mb-8 relative z-10">
          <StatCell value="34 min" label="Time Spent" icon={<Clock className="w-4 h-4" />} />
          <StatCell value="18" label="Exchanges" icon={<MessageSquare className="w-4 h-4" />} />
          <StatCell value="8 / 10" label="Correct" icon={<CheckCircle2 className="w-4 h-4" />} />
          <StatCell value="3" label="Concepts Covered" icon={<Brain className="w-4 h-4" />} />
        </div>

        {/* Skill Deltas */}
        <div className="w-full space-y-3 mb-10 relative z-10">
          <SkillRow name="Chain Rule" before="38%" after="50%" delta="+12%" />
          <SkillRow name="Derivatives" before="60%" after="65%" delta="+5%" />
        </div>

        {/* XP Counter */}
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="text-text-gold-deep font-mono text-[54px] font-bold leading-none tracking-tighter">
            +{xp}
          </div>
          <span className="text-text-tertiary text-[11px] font-bold uppercase tracking-[0.2em] mt-2">XP Earned</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full relative z-10">
          <GlowButton variant="primary" className="w-full justify-center py-4 text-[15px]" onClick={() => { onClose(); router.push("/dashboard/subjects"); }}>
            Start Next Session <ArrowRight className="w-4 h-4 ml-2" />
          </GlowButton>
          <button 
            onClick={onClose}
            className="w-full py-3.5 text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            End for Today
          </button>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-text-tertiary hover:text-text-primary transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>

      <style jsx>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1 }
          100% { transform: translateY(400px) rotate(360deg); opacity: 0 }
        }
        .confetti {
          position: absolute;
          z-index: 5;
        }
      `}</style>
    </div>
  );
}

function StatCell({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="bg-bg-overlay/50 border border-border-subtle rounded-[24px] p-5 flex flex-col items-center text-center shadow-sm">
      <div className="text-text-tertiary mb-2.5 opacity-80">{icon}</div>
      <div className="font-mono text-[26px] font-bold text-text-heading leading-tight tracking-tight">{value}</div>
      <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.12em] mt-1.5">{label}</div>
    </div>
  );
}

function SkillRow({ name, before, after, delta }: { name: string; before: string; after: string; delta: string }) {
  return (
    <div className="flex items-center justify-between px-2 bg-bg-surface/30 p-2.5 rounded-xl border border-border-faint">
      <div className="flex items-center gap-3">
        <span className="text-[14px] font-semibold text-text-secondary">{name}</span>
        <div className="flex items-center gap-2 text-[12px] text-text-tertiary font-medium">
          <span>{before}</span>
          <ArrowRight className="w-3 h-3 opacity-50" />
          <span className="text-text-primary font-bold">{after}</span>
        </div>
      </div>
      <div className="bg-semantic-success-muted border border-semantic-success-border text-semantic-success-text text-[11px] font-bold px-2.5 py-1 rounded-lg">
        {delta}
      </div>
    </div>
  );
}
