"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronDown, LogOut, Settings, User as UserIcon, LayoutDashboard, History, BookOpen, Trophy, ChevronRight, Briefcase } from "lucide-react";
import Link from "next/link";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
import { getSessionStats } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSubject = searchParams.get("subject") || "Mathematics";
  const { data: session, status } = useSession();
  const [dropOpen, setDropOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    // ── AUTH CHECK ────────────────────────────────
    if (status === "unauthenticated") {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 500);
      return () => clearTimeout(timer);
    }
    
    // ── ONBOARDING CHECK ────────────────────────────────
    if (status === "authenticated" && typeof window !== "undefined") {
      const email = session?.user?.email ?? "user";
      const key = `onboarding_${email}`;
      if (localStorage.getItem(key) === "true") return; // already done

      const token = (session as any)?.accessToken as string | undefined;
      if (!token) return; // token not ready yet — wait for next render

      getSessionStats(token)
        .then((stats) => {
          if (stats.total_sessions > 0) {
            // Existing user — mark complete and stay on dashboard
            localStorage.setItem(key, "true");
          } else {
            // Truly new user — no sessions ever
            router.push("/onboarding");
          }
        })
        .catch(() => {
          // On error, don't redirect — safer to show dashboard than loop onboarding
        });
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-text-gold-deep border-border-faint animate-spin" />
          <p className="text-text-secondary text-sm font-medium tracking-wide">Initializing session...</p>
        </div>
      </div>
    );
  }

  const name = session?.user?.name ?? "Learner";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Subjects", href: "/dashboard/subjects", icon: BookOpen },
    { label: "Interview", href: "/dashboard/interview", icon: Briefcase },
    { label: "History", href: "/dashboard/history", icon: History },
    { label: "Achievements", href: "/dashboard/achievements", icon: Trophy },
  ];

  return (
    <div className="flex flex-col font-body bg-bg-page h-screen overflow-hidden selection:bg-gold-500/10 selection:text-text-gold-deep antialiased">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-8 flex-shrink-0 z-50 bg-bg-page/80 backdrop-blur-2xl border-b border-border-subtle h-20 shadow-sm relative">
        {/* Left: Logo & Subject */}
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center group">
              <div className="w-5 h-5 bg-gold-500 rounded-sm rotate-45 mr-2 shadow-[0_0_12px_rgba(138,98,0,0.2)] transition-transform group-hover:rotate-[135deg]" />
              <span className="font-display font-semibold text-[24px] text-text-heading tracking-tight antialiased">Virtuara</span>
              <span className="font-display font-semibold text-[24px] text-text-gold tracking-tight antialiased">AI</span>
            </Link>

            {/* Change Subject Button */}
            <div className="hidden lg:flex items-center h-10 px-4 rounded-xl border border-border-subtle bg-bg-surface/50 gap-4 backdrop-blur-sm group hover:border-gold-500/30 transition-all cursor-default shadow-sm">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-text-gold-deep group-hover:scale-110 transition-transform" />
                <span className="text-[13px] font-bold text-text-primary tracking-tight antialiased">{currentSubject}</span>
              </div>
              <div className="w-[1px] h-4 bg-border-subtle" />
              <Link 
                href="/dashboard/subjects" 
                className="flex items-center gap-1.5 text-[10px] font-bold text-text-gold hover:text-text-gold-deep transition-all uppercase tracking-[0.15em] antialiased"
              >
                Change
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-10 ml-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 text-[14px] font-bold transition-all duration-300 relative group py-2 tracking-tight antialiased ${
                    isActive ? "text-text-heading font-extrabold" : "text-text-secondary hover:text-text-heading"
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] transition-all duration-300 ${isActive ? "text-text-gold-deep" : "text-text-tertiary group-hover:text-text-gold"}`} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-active" 
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold-400 rounded-full shadow-[0_0_12px_rgba(212,175,55,0.4)]" 
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Notifications & User */}
        <div className="flex items-center gap-8">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={`relative p-3 rounded-xl transition-all duration-500 ${
                notifOpen ? "bg-bg-surface text-text-gold-deep ring-1 ring-gold-500/20 shadow-sm" : "text-text-tertiary hover:text-text-heading hover:bg-bg-surface/50"
              }`}
            >
              <Bell className="w-[22px] h-[22px]" />
            </button>
            <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setDropOpen(!dropOpen)}
              className="flex items-center gap-4 p-1.5 pr-5 rounded-2xl bg-bg-surface/50 border border-border-subtle hover:border-gold-500/30 hover:bg-bg-surface transition-all group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-text-on-dark text-[14px] font-bold bg-gold-500 shadow-sm group-hover:scale-105 transition-transform antialiased">
                {initials}
              </div>
              <span className="text-[14px] font-bold text-text-primary hidden sm:block tracking-tight antialiased">{name}</span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform duration-700 ${dropOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.98, y: 12, filter: "blur(4px)" }}
                  className="absolute right-0 top-[64px] w-[260px] rounded-[24px] overflow-hidden z-[100] bg-bg-surface border border-border-default shadow-xl backdrop-blur-2xl"
                >
                  <div className="px-7 py-6 border-b border-border-subtle bg-bg-overlay/20">
                    <p className="text-[15px] font-bold text-text-heading truncate antialiased">{name}</p>
                    <p className="text-[10px] truncate text-text-tertiary font-bold tracking-[0.1em] mt-1.5 uppercase opacity-90 antialiased">Personal Learner Account</p>
                  </div>
                  
                  <div className="p-2.5 space-y-1">
                    <Link href="/dashboard/settings" onClick={() => setDropOpen(false)}
                      className="w-full flex items-center gap-4 px-4.5 py-3.5 text-[14px] font-bold text-text-secondary hover:text-text-gold-deep hover:bg-bg-active/20 rounded-xl transition-all group antialiased">
                      <Settings className="w-[18px] h-[18px] text-text-tertiary group-hover:text-text-gold-deep" />Settings
                    </Link>
                    <Link href="/dashboard/achievements" onClick={() => setDropOpen(false)}
                      className="w-full flex items-center gap-4 px-4.5 py-3.5 text-[14px] font-bold text-text-secondary hover:text-text-gold-deep hover:bg-bg-active/20 rounded-xl transition-all group antialiased">
                      <UserIcon className="w-[18px] h-[18px] text-text-tertiary group-hover:text-text-gold-deep" />Achievements
                    </Link>
                  </div>
 
                  <div className="p-2.5 border-t border-border-subtle bg-bg-overlay/30">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-4 px-4.5 py-3.5 text-[14px] font-bold text-semantic-error hover:bg-semantic-error-muted rounded-xl transition-all antialiased">
                      <LogOut className="w-[18px] h-[18px]" />Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

    </div>
  );
}
