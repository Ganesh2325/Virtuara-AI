"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  Clock,
  Target,
  Brain,
  ArrowUpRight,
  BookOpen,
  TrendingUp,
  Loader2,
} from "lucide-react";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getSessions, type DjangoSession } from "@/lib/api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
}

function formatDuration(mins: number | null) {
  if (!mins) return "—";
  return `${mins} min`;
}

function formatScore(score: number | null) {
  if (score === null) return "—";
  return `${score}/100`;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<DjangoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = (session as any)?.accessToken as string | undefined;
    if (!token) {
      setLoading(false);
      return;
    }

    getSessions(token)
      .then((data) => setSessions(data.results ?? []))
      .catch(() => setError("Could not load sessions. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = sessions.filter((s) => {
    const subjectName = s.subject_name ?? "";
    return subjectName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-full bg-bg-page px-6 py-12 lg:px-12 selection:bg-gold-500/10 antialiased relative">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="font-display font-semibold text-[56px] text-text-heading tracking-tight leading-[1.1] mb-4 antialiased">
            Session History
          </h1>
          <p className="text-text-secondary text-[18px] font-medium leading-relaxed antialiased">
            Review your past learning sessions and track your mastery trajectory through the vault.
          </p>
        </header>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <div className="ml-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-text-gold-deep transition-colors" />
            <input
              type="text"
              placeholder="Search by subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-2.5 bg-bg-surface border border-border-subtle rounded-full text-[14px] text-text-primary font-bold outline-none focus:border-gold-500/50 focus:shadow-sm transition-all w-72 placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-text-gold-deep animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-16 text-center">
            <p className="text-semantic-error-text font-bold mb-4">{error}</p>
          </div>
        )}

        {/* Empty State (no sessions yet) */}
        {!loading && !error && filtered.length === 0 && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center text-text-tertiary mb-6 border border-border-subtle">
              <BookOpen className="w-9 h-9" />
            </div>
            <h3 className="font-display text-[24px] font-bold text-text-heading mb-3">No sessions yet</h3>
            <p className="text-text-secondary text-[15px] font-medium max-w-sm opacity-70">
              Start a learning session from the dashboard to see your history here.
            </p>
          </div>
        )}

        {/* Session List */}
        {!loading && !error && (
          <div className="space-y-6">
            {filtered.map((s) => {
              const { day, month } = formatDate(s.started_at);
              return (
                <SessionRow
                  key={s.id}
                  day={day}
                  month={month}
                  subjectName={s.subject_name ?? "General"}
                  sessionType={s.session_type}
                  duration={formatDuration(s.duration_minutes)}
                  score={formatScore(s.score)}
                  status={s.status}
                  messageCount={s.message_count}
                  isExpanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                />
              );
            })}
          </div>
        )}

        {/* Load More placeholder */}
        {!loading && filtered.length > 0 && (
          <button className="mt-16 w-full py-5 rounded-2xl border border-dashed border-border-subtle text-[12px] font-bold text-text-tertiary uppercase tracking-[0.2em] hover:text-text-gold-deep hover:bg-bg-surface hover:border-gold-500/30 transition-all antialiased">
            Retrieve Older Sessions
          </button>
        )}
      </div>
    </div>
  );
}

function SessionRow({
  day, month, subjectName, sessionType, duration, score, status, messageCount, isExpanded, onToggle,
}: {
  day: string; month: string; subjectName: string;
  sessionType: string; duration: string; score: string; status: string;
  messageCount: number; isExpanded: boolean; onToggle: () => void;
}) {
  const statusColor = status === "completed" ? "text-color-success-text" : status === "active" ? "text-text-gold-deep" : "text-text-tertiary";

  return (
    <div className={`bg-bg-surface border ${isExpanded ? "border-gold-500/30 shadow-lg ring-1 ring-gold-500/5" : "border-border-subtle"} rounded-[32px] overflow-hidden transition-all duration-700 hover:border-gold-500/20 antialiased`}>
      <div
        onClick={onToggle}
        className="p-6 md:px-10 md:py-8 cursor-pointer grid grid-cols-[auto_1fr_auto_auto] items-center gap-6 md:gap-12"
      >
        {/* Date */}
        <div className="bg-bg-overlay/50 border border-border-subtle rounded-2xl p-3 min-w-[72px] text-center shrink-0 shadow-sm">
          <div className="font-mono text-[28px] font-bold text-text-heading leading-none antialiased">{day}</div>
          <div className="text-[11px] font-bold text-text-gold-deep uppercase tracking-[0.15em] mt-1.5 antialiased">{month}</div>
        </div>

        {/* Info */}
        <div className="overflow-hidden">
          <h3 className="font-display text-[22px] font-bold text-text-heading truncate mb-3 antialiased">
            <span className="text-text-tertiary font-bold">{subjectName} <span className="mx-1.5 opacity-30">|</span></span>
            <span className="capitalize">{sessionType}</span> Session
          </h3>
          <div className="flex flex-wrap gap-2.5">
            <StatPill icon={<Clock className="w-3.5 h-3.5" />} label={duration} />
            <StatPill icon={<Target className="w-3.5 h-3.5" />} label={score} />
            <StatPill icon={<Brain className="w-3.5 h-3.5" />} label={`${messageCount} messages`} />
          </div>
        </div>

        {/* Status */}
        <div className="hidden sm:block text-right">
          <div className={`font-mono text-[14px] font-bold tracking-tight antialiased capitalize ${statusColor}`}>{status}</div>
          <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.2em] mt-1 antialiased">{sessionType}</div>
        </div>

        {/* Chevron */}
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-text-tertiary">
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden border-t border-border-subtle bg-bg-overlay/20"
          >
            <div className="p-10 md:px-20 md:pb-14 flex items-center gap-6">
              <button className="text-[14px] font-bold text-text-gold-deep hover:text-text-gold transition-all flex items-center gap-2 group antialiased">
                Continue Session <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <div className="w-1 h-1 rounded-full bg-border-subtle" />
              <div className="flex items-center gap-2 text-text-tertiary text-[13px] font-bold">
                <TrendingUp className="w-4 h-4" />
                {messageCount} exchanges logged
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-bg-surface border border-border-subtle rounded-full text-[12px] font-bold text-text-secondary antialiased shadow-sm">
      <span className="text-text-gold-deep opacity-60">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
