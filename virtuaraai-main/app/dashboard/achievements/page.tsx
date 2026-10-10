"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Trophy, Star, Target, Zap, Flame, BookOpen, Brain, Loader2, Lock } from "lucide-react";
import { getSessionStats } from "@/lib/api";

interface Stats {
  total_sessions: number;
  total_study_minutes: number;
  streak_days: number;
  average_score: number | null;
  sessions_this_week: number;
  favourite_subject: string | null;
}

const ACHIEVEMENTS = [
  {
    id: "first_session",
    name: "First Steps",
    desc: "Completed your first learning session",
    icon: Star,
    color: "#FFD700",
    check: (s: Stats) => s.total_sessions >= 1,
    xp: 50,
  },
  {
    id: "fast_learner",
    name: "Fast Learner",
    desc: "Completed 5 sessions in one week",
    icon: Zap,
    color: "#FF9A3D",
    check: (s: Stats) => s.sessions_this_week >= 5,
    xp: 150,
  },
  {
    id: "streak_3",
    name: "On a Roll",
    desc: "Maintained a 3-day learning streak",
    icon: Flame,
    color: "#FF6B6B",
    check: (s: Stats) => s.streak_days >= 3,
    xp: 100,
  },
  {
    id: "streak_7",
    name: "Seven Seas",
    desc: "Maintained a 7-day learning streak",
    icon: Flame,
    color: "#FF4D4D",
    check: (s: Stats) => s.streak_days >= 7,
    xp: 300,
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    desc: "Achieved 100% average score across sessions",
    icon: Star,
    color: "#FFD700",
    check: (s: Stats) => (s.average_score ?? 0) >= 100,
    xp: 500,
  },
  {
    id: "high_scorer",
    name: "High Achiever",
    desc: "Maintained an average score above 80%",
    icon: Target,
    color: "#4DABFF",
    check: (s: Stats) => (s.average_score ?? 0) >= 80,
    xp: 200,
  },
  {
    id: "dedicated",
    name: "Dedicated",
    desc: "Studied for over 60 minutes total",
    icon: BookOpen,
    color: "#00E0A1",
    check: (s: Stats) => s.total_study_minutes >= 60,
    xp: 150,
  },
  {
    id: "master_mind",
    name: "Master Mind",
    desc: "Completed 10 or more learning sessions",
    icon: Brain,
    color: "#9D4DFF",
    check: (s: Stats) => s.total_sessions >= 10,
    xp: 400,
  },
  {
    id: "champion",
    name: "Champion",
    desc: "Completed 25 sessions — true dedication",
    icon: Trophy,
    color: "#FF9A3D",
    check: (s: Stats) => s.total_sessions >= 25,
    xp: 1000,
  },
];

export default function AchievementsPage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false); // no backend — show locked state immediately
      return;
    }
    getSessionStats(accessToken)
      .then(setStats)
      .catch(() => {}) // stats unavailable — show locked state
      .finally(() => setLoading(false));
  }, [accessToken]);

  const unlocked = stats ? ACHIEVEMENTS.filter((a) => a.check(stats)) : [];
  const totalXP = unlocked.reduce((sum, a) => sum + a.xp, 0);
  const totalSessions = stats?.total_sessions ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-text-gold-deep animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-10 md:px-12 md:py-16 bg-bg-page selection:bg-gold-500/10 antialiased relative">
      <div className="max-w-5xl mx-auto">
        <header className="mb-14">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2.5 rounded-xl bg-bg-surface text-text-gold-deep border border-border-gold shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-text-tertiary">Verified Milestones</p>
          </div>
          <h1 className="font-display font-semibold text-[56px] text-text-heading tracking-tight leading-[1.05] mb-4">Achievements</h1>
          <p className="text-text-secondary text-[18px] font-bold max-w-2xl leading-relaxed">
            Your verified learning milestones earned through real sessions on Virtuara AI.
          </p>
        </header>

        {/* No-stats banner */}
        {!stats && (
          <div className="mb-10 flex items-center gap-4 px-6 py-4 rounded-2xl bg-gold-500/5 border border-border-gold">
            <Lock className="w-5 h-5 text-text-gold-deep flex-shrink-0" />
            <p className="text-[14px] font-bold text-text-secondary">
              Complete learning sessions to unlock achievements. Start a session from the{" "}
              <a href="/dashboard" className="text-text-gold-deep underline underline-offset-4 hover:text-text-gold transition-colors">Dashboard</a>.
            </p>
          </div>
        )}

        {/* Summary card */}
        <section className="mb-16">
          <div className="bg-bg-surface border-2 border-border-gold rounded-[40px] p-8 md:p-14 flex flex-col md:flex-row items-center gap-14 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-gold-500/10 transition-all duration-1000" />
            <div className="relative">
              <div className="w-40 h-40 bg-bg-page rounded-[32px] flex items-center justify-center shadow-lg ring-1 ring-border-gold">
                <Trophy className="w-24 h-24 text-text-gold-deep group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700 drop-shadow-[0_0_12px_rgba(138,98,0,0.2)]" strokeWidth={1} />
              </div>
              <div className="absolute -top-2 -right-2 w-14 h-14 bg-text-gold-deep rounded-full flex items-center justify-center text-white text-[18px] font-bold border-4 border-bg-surface shadow-sm">
                {unlocked.length}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left relative z-10">
              <h2 className="font-display font-semibold text-[36px] text-text-heading mb-4 leading-tight">
                {unlocked.length === 0 ? "Start your journey." : "Keep going!"}
              </h2>
              <p className="text-[17px] text-text-secondary leading-[1.65] font-bold mb-10 max-w-lg">
                {unlocked.length === 0
                  ? "Complete your first session to unlock achievements."
                  : `You've unlocked ${unlocked.length} of ${ACHIEVEMENTS.length} achievements. ${ACHIEVEMENTS.length - unlocked.length} more to go!`}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-8 md:gap-14">
                <div className="flex flex-col">
                  <span className="text-[28px] font-mono font-bold text-text-heading tracking-tighter">{totalXP}</span>
                  <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mt-1">Total XP</span>
                </div>
                <div className="w-px h-14 bg-border-subtle" />
                <div className="flex flex-col">
                  <span className="text-[28px] font-mono font-bold text-text-heading tracking-tighter">{totalSessions}</span>
                  <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mt-1">Sessions</span>
                </div>
                <div className="w-px h-14 bg-border-subtle" />
                <div className="flex flex-col">
                  <span className="text-[28px] font-mono font-bold text-text-gold-deep tracking-tighter">{stats?.streak_days ?? 0}d</span>
                  <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] mt-1">Streak</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Badge grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {ACHIEVEMENTS.map((badge, i) => {
            const isUnlocked = stats ? badge.check(stats) : false;
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`p-10 rounded-[36px] border transition-all duration-700 group ${
                  isUnlocked
                    ? "bg-bg-surface border-border-subtle shadow-sm hover:border-border-gold hover:shadow-md hover:-translate-y-2"
                    : "bg-bg-overlay/40 border-border-subtle grayscale opacity-40 hover:grayscale-0 hover:opacity-70 transition-all duration-700"
                }`}
              >
                <div
                  className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-8 relative group-hover:rotate-12 transition-transform duration-700 shadow-sm"
                  style={{
                    backgroundColor: isUnlocked ? `${badge.color}15` : "rgba(0,0,0,0.03)",
                    color: isUnlocked ? badge.color : "var(--text-tertiary)",
                  }}
                >
                  <Icon className="w-12 h-12" strokeWidth={1.5} />
                </div>
                <h3 className={`font-display text-[24px] font-bold mb-3 transition-colors ${isUnlocked ? "text-text-heading" : "text-text-tertiary"}`}>
                  {badge.name}
                </h3>
                <p className="text-[15px] text-text-secondary font-bold leading-[1.6] mb-4">{badge.desc}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    isUnlocked ? "bg-semantic-success-muted text-semantic-success-text" : "bg-bg-surface text-text-tertiary border border-border-subtle"
                  }`}>
                    {isUnlocked ? `+${badge.xp} XP` : "Locked"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
