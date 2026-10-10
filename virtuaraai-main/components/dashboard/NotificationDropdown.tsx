"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellOff, ArrowRight, MessageSquare, Award, Flame } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getSessionStats, getSessions } from "@/lib/api";

interface Notification {
  id: string;
  type: "message" | "achievement" | "system" | "streak";
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!accessToken || !isOpen) return;

    Promise.all([
      getSessionStats(accessToken),
      getSessions(accessToken, { ordering: "-started_at" }),
    ]).then(([stats, sessions]) => {
      const notifs: Notification[] = [];

      // Streak notification
      if (stats.streak_days >= 1) {
        notifs.push({
          id: "streak",
          type: "streak",
          title: `${stats.streak_days}-Day Streak!`,
          desc: `You've been learning for ${stats.streak_days} day${stats.streak_days > 1 ? "s" : ""} in a row. Keep it up!`,
          time: "today",
          read: false,
        });
      }

      // Recent quiz completions
      const quizSessions = (sessions.results ?? []).filter(
        (s) => s.session_type === "quiz" && s.score !== null
      ).slice(0, 2);

      quizSessions.forEach((s) => {
        notifs.push({
          id: `quiz-${s.id}`,
          type: "achievement",
          title: "Quiz Completed",
          desc: `You scored ${s.score}/100 on ${s.subject_name ?? "a quiz"}. ${(s.score ?? 0) >= 80 ? "Great job!" : "Keep practicing!"}`,
          time: timeAgo(s.started_at),
          read: false,
        });
      });

      // Milestone notifications
      if (stats.total_sessions === 1) {
        notifs.push({
          id: "milestone-first",
          type: "achievement",
          title: "First Session Unlocked!",
          desc: "You completed your first learning session. Welcome to Virtuara AI!",
          time: "recently",
          read: false,
        });
      } else if (stats.total_sessions >= 10) {
        notifs.push({
          id: "milestone-10",
          type: "achievement",
          title: "Master Mind Achievement!",
          desc: "You've completed 10 sessions. You're building real momentum!",
          time: "recently",
          read: true,
        });
      }

      // Favourite subject nudge
      if (stats.favourite_subject) {
        notifs.push({
          id: "subject-nudge",
          type: "message",
          title: `Keep going in ${stats.favourite_subject}`,
          desc: `${stats.favourite_subject} is your most studied subject. Start a new session to keep progressing.`,
          time: "today",
          read: true,
        });
      }

      setNotifications(notifs.slice(0, 5));
    }).catch(() => {
      // Fallback: show a welcome notification
      setNotifications([{
        id: "welcome",
        type: "system",
        title: "Welcome to Virtuara AI",
        desc: "Start a learning session to see your personalised notifications here.",
        time: "now",
        read: false,
      }]);
    });
  }, [accessToken, isOpen]);

  const unread = notifications.filter((n) => !read.has(n.id) && !n.read);

  const markAllRead = () => {
    setRead(new Set(notifications.map((n) => n.id)));
  };

  const iconFor = (type: Notification["type"]) => {
    if (type === "streak") return <Flame className="w-5 h-5" strokeWidth={1.5} />;
    if (type === "achievement") return <Award className="w-5 h-5" strokeWidth={1.5} />;
    if (type === "message") return <MessageSquare className="w-5 h-5" strokeWidth={1.5} />;
    return <BellOff className="w-5 h-5" strokeWidth={1.5} />;
  };

  const colorFor = (type: Notification["type"]) => {
    if (type === "streak") return "bg-orange-500/10 text-orange-500";
    if (type === "achievement") return "bg-gold-500/10 text-text-gold-deep";
    if (type === "message") return "bg-bg-active text-text-primary";
    return "bg-bg-page border border-border-subtle text-text-tertiary";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8, x: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8, x: 12 }}
            className="absolute right-0 top-[52px] w-[380px] rounded-2xl overflow-hidden z-[70] bg-bg-surface border border-border-subtle shadow-lg shadow-gold-900/5 flex flex-col backdrop-blur-xl"
          >
            <div className="px-7 py-5 border-b border-border-subtle flex items-center justify-between bg-bg-page/50">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-[20px] text-text-heading">Notifications</h3>
                {unread.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-text-gold-deep text-white text-[10px] font-bold flex items-center justify-center">
                    {unread.length}
                  </span>
                )}
              </div>
              {unread.length > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-bold text-text-gold-deep hover:text-text-gold transition-colors uppercase tracking-[0.1em]">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[440px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((n) => {
                    const isRead = read.has(n.id) || n.read;
                    return (
                      <div
                        key={n.id}
                        className={`px-7 py-6 flex items-start gap-4 text-left border-b border-border-subtle/50 last:border-0 group ${
                          !isRead ? "bg-bg-surface/40" : ""
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform ${colorFor(n.type)}`}>
                          {iconFor(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className={`text-[15px] font-bold truncate ${!isRead ? "text-text-primary" : "text-text-secondary"}`}>{n.title}</span>
                            <span className="text-[11px] font-bold text-text-tertiary whitespace-nowrap uppercase tracking-tight">{n.time}</span>
                          </div>
                          <p className="text-[13px] text-text-secondary font-medium leading-relaxed line-clamp-2">{n.desc}</p>
                        </div>
                        {!isRead && <div className="w-2 h-2 rounded-full bg-text-gold-deep mt-2.5 shrink-0 shadow-sm" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-12 py-20 text-center">
                  <div className="w-16 h-16 bg-bg-page rounded-full flex items-center justify-center mx-auto mb-6 text-text-tertiary border border-border-subtle shadow-inner">
                    <BellOff className="w-8 h-8" />
                  </div>
                  <p className="text-[16px] font-semibold text-text-heading">All caught up!</p>
                  <p className="text-[13px] text-text-secondary mt-2 font-medium opacity-60">Start a session to see notifications here.</p>
                </div>
              )}
            </div>

            <Link
              href="/dashboard/achievements"
              onClick={onClose}
              className="p-4 text-center text-[12px] font-bold text-text-secondary hover:text-text-primary bg-bg-surface/80 hover:bg-bg-active transition-all border-t border-border-subtle flex items-center justify-center gap-2 uppercase tracking-[0.15em]"
            >
              View achievements
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
