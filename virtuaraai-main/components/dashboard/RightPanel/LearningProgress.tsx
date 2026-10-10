"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Flame, Loader2, BookOpen, Clock, Target, TrendingUp } from "lucide-react";
import ProgressRing from "@/components/shared/ProgressRing";
import { getSessionStats, getSessions, type DjangoSession } from "@/lib/api";

interface Stats {
  total_sessions: number;
  total_study_minutes: number;
  streak_days: number;
  average_score: number | null;
  sessions_this_week: number;
  favourite_subject: string | null;
}

export default function LearningProgress() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSessions, setRecentSessions] = useState<DjangoSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false); // no backend — show empty state
      return;
    }

    Promise.all([
      getSessionStats(accessToken),
      getSessions(accessToken, { ordering: "-started_at" }),
    ])
      .then(([s, sess]) => {
        setStats(s);
        setRecentSessions((sess.results ?? []).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  // Refresh stats every 60s while dashboard is open (streak updates server-side)
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => {
      getSessionStats(accessToken).then(setStats).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-text-gold-deep animate-spin" />
      </div>
    );
  }

  const totalMastery = stats?.average_score ?? 0;
  const streakDays = stats?.streak_days ?? 0;
  const totalSessions = stats?.total_sessions ?? 0;
  const studyMinutes = stats?.total_study_minutes ?? 0;
  const avgScore = stats?.average_score;
  const thisWeek = stats?.sessions_this_week ?? 0;
  const favSubject = stats?.favourite_subject;

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto px-6 py-6 bg-transparent custom-scrollbar">

      {/* Current Focus */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 rounded-[24px] bg-bg-surface border border-border-subtle shadow-sm hover:border-border-default hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-6 rounded-sm bg-text-gold-deep" />
          <p className="text-[10px] font-semibold tracking-[0.10em] uppercase text-text-tertiary">
            {favSubject ? "Favourite Subject" : "Current Focus"}
          </p>
        </div>
        <h4 className="font-display font-bold text-text-heading text-[22px] leading-tight group-hover:text-text-gold-deep transition-colors">
          {favSubject ?? "Start a session"}
        </h4>
        <p className="text-[13px] mt-1.5 mb-5 text-text-tertiary font-medium">
          {thisWeek > 0 ? `${thisWeek} session${thisWeek > 1 ? "s" : ""} this week` : "No sessions yet this week"}
        </p>
        <div className="rounded-full overflow-hidden h-1.5 bg-bg-active/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(totalMastery, 100)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full rounded-full bg-text-gold-deep shadow-sm"
          />
        </div>
        <div className="flex justify-between items-center mt-2.5">
          <p className="text-[11px] text-text-gold-deep font-bold tracking-tight">
            {avgScore != null ? `${Math.round(avgScore)}% avg score` : "No scores yet"}
          </p>
          <p className="text-[11px] text-text-tertiary font-medium">{studyMinutes} min total</p>
        </div>
      </motion.div>

      {/* Trajectory */}
      <div className="p-6 rounded-[24px] bg-bg-surface border border-border-subtle hover:border-border-default transition-all shadow-sm">
        <h4 className="text-[10px] font-semibold text-text-tertiary mb-5 uppercase tracking-[0.10em]">Trajectory</h4>
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 pr-4">
            <p className="text-[32px] font-display font-semibold text-text-primary tracking-tight">
              {avgScore != null ? `${Math.round(avgScore)}%` : "—"}
            </p>
            <p className="text-[13px] text-text-secondary -mt-1 font-medium">Avg Score</p>
            {streakDays > 0 && (
              <div className="flex items-center gap-2 mt-3 bg-semantic-warning-muted border border-semantic-warning-border w-fit px-2.5 py-1 rounded-lg">
                <Flame className="w-3.5 h-3.5 text-semantic-warning" />
                <span className="text-[10px] font-bold text-semantic-warning-text tracking-widest uppercase">
                  {streakDays} Day Streak
                </span>
              </div>
            )}
          </div>
          <ProgressRing
            value={avgScore ?? 0}
            size={72}
            strokeWidth={6}
            color="var(--text-gold-deep)"
            label={avgScore != null ? String(Math.round(avgScore)) : "0"}
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-text-secondary font-medium">Total Sessions</span>
            <span className="text-text-primary font-mono font-bold">{totalSessions}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-text-secondary font-medium">Study Time</span>
            <span className="text-text-gold-deep font-mono font-bold">
              {studyMinutes >= 60
                ? `${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m`
                : `${studyMinutes}m`}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-text-secondary font-medium">This Week</span>
            <span className="text-text-primary font-mono font-bold">{thisWeek} sessions</span>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h4 className="text-[10px] font-bold text-text-tertiary mb-4 uppercase tracking-[0.12em] flex items-center gap-3">
          Recent Sessions
          <span className="flex-1 h-[1px] bg-border-faint" />
        </h4>

        {recentSessions.length === 0 ? (
          <div className="p-6 rounded-[18px] bg-bg-overlay border border-border-subtle text-center">
            <BookOpen className="w-8 h-8 text-text-tertiary mx-auto mb-3 opacity-40" />
            <p className="text-[13px] text-text-tertiary font-medium">No sessions yet.</p>
            <p className="text-[12px] text-text-tertiary opacity-60 mt-1">Start chatting with Aria to track progress.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentSessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 rounded-[18px] bg-bg-overlay border border-border-subtle hover:border-border-default transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold text-text-primary truncate max-w-[140px]">
                    {s.subject_name ?? "General"}
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    s.status === "completed"
                      ? "bg-semantic-success-muted text-semantic-success-text"
                      : "bg-bg-surface text-text-tertiary border border-border-subtle"
                  }`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-text-tertiary font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {s.duration_minutes ? `${s.duration_minutes}m` : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {s.score != null ? `${s.score}/100` : "—"}
                  </span>
                  <span className="flex items-center gap-1 capitalize">
                    <TrendingUp className="w-3 h-3" />
                    {s.session_type}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Live stats grid */}
      <div className="p-6 rounded-[24px] bg-bg-surface border border-border-subtle hover:border-border-default transition-all shadow-sm">
        <h4 className="text-[10px] font-bold text-text-tertiary mb-5 uppercase tracking-[0.12em]">Session Stats</h4>
        <div className="grid grid-cols-2 gap-3.5">
          {[
            { icon: "⏱", label: "Study Time", value: studyMinutes >= 60 ? `${Math.floor(studyMinutes / 60)}h` : `${studyMinutes}m` },
            { icon: "💬", label: "Sessions", value: String(totalSessions) },
            { icon: "✅", label: "Avg Score", value: avgScore != null ? `${Math.round(avgScore)}%` : "—" },
            { icon: "🔥", label: "Streak", value: `${streakDays}d` },
          ].map((stat) => (
            <div key={stat.label}
              className="p-4 rounded-[18px] text-center bg-bg-surface border border-border-subtle shadow-sm group hover:border-border-gold transition-colors">
              <p className="text-[20px] mb-2 leading-none opacity-80 group-hover:scale-110 transition-transform">{stat.icon}</p>
              <p className="text-[16px] font-mono font-bold tracking-tight text-text-heading">{stat.value}</p>
              <p className="text-[10px] font-semibold tracking-[0.10em] text-text-tertiary uppercase mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
