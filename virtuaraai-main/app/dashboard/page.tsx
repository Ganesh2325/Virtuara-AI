"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import ConversationPanel from "@/components/dashboard/LeftPanel/ConversationPanel";
import AvatarStream from "@/components/dashboard/CenterPanel/AvatarStream";
import LearningProgress from "@/components/dashboard/RightPanel/LearningProgress";
import SessionSummary from "@/components/dashboard/SessionSummary";
import { motion, AnimatePresence } from "framer-motion";

const tabs = ["Chat", "Mentor", "Progress"] as const;
type Tab = (typeof tabs)[number];

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = (session as any)?.user?.name?.split(" ")?.[0] ?? "Learner";

  const [activeTab, setActiveTab] = useState<Tab>("Mentor");
  const [speaking, setSpeaking] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div className="w-full h-full flex flex-col bg-bg-page antialiased">
      {/* ── 3-COLUMN GRID (desktop) ──────────────────── */}
      <div className="hidden lg:grid flex-1 overflow-hidden" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="overflow-hidden bg-bg-surface border-r border-border-subtle relative z-10 shadow-sm">
          <ConversationPanel onAISpeak={() => setSpeaking(true)} />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} className="overflow-hidden bg-bg-page relative z-0">
          <AvatarStream speaking={speaking} onEndSession={() => setShowSummary(true)} />
          
          <AnimatePresence>
            {showSummary && (
              <SessionSummary 
                isOpen={showSummary} 
                onClose={() => setShowSummary(false)} 
                userName={userName} 
              />
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="overflow-hidden bg-bg-surface border-l border-border-subtle relative z-10 shadow-sm">
          <LearningProgress />
        </motion.div>
      </div>

      {/* ── MOBILE TABS ──────────────────────────────── */}
      <div className="flex-1 overflow-hidden lg:hidden flex flex-col bg-bg-page">
        <div className="flex-1 overflow-hidden">
          {activeTab === "Chat" && <ConversationPanel />}
          {activeTab === "Mentor" && (
            <div className="relative h-full">
              <AvatarStream speaking={speaking} onEndSession={() => setShowSummary(true)} />
              <AnimatePresence>
                {showSummary && (
                  <SessionSummary 
                    isOpen={showSummary} 
                    onClose={() => setShowSummary(false)} 
                    userName={userName} 
                  />
                )}
              </AnimatePresence>
            </div>
          )}
          {activeTab === "Progress" && <LearningProgress />}
        </div>
        <div className="flex items-center border-t border-border-subtle bg-bg-surface/90 backdrop-blur-2xl h-[80px] px-8 pb-4">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all duration-500 ${
                activeTab === tab ? "text-text-gold-deep scale-105" : "text-text-tertiary hover:text-text-secondary"
              }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                activeTab === tab ? "bg-gold-500/10 shadow-sm border border-border-gold" : "bg-transparent border border-transparent"
              }`}>
                <span className="text-[22px] filter contrast-[1.1]">{tab === "Chat" ? "💬" : tab === "Mentor" ? "🤖" : "📊"}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] antialiased">{tab}</span>
              {activeTab === tab && (
                <motion.div layoutId="active-tab-dot" className="w-1 h-1 rounded-full bg-text-gold-deep mt-1 shadow-sm" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
