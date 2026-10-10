"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Command, ArrowUp, CornerDownLeft, Search, Mic, Settings } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { group: "Navigation", keys: [
    { label: "Go to Dashboard", keys: ["G", "D"] },
    { label: "My Subjects", keys: ["G", "S"] },
    { label: "Learning History", keys: ["G", "H"] },
    { label: "Settings", keys: ["G", "P"] },
  ]},
  { group: "Session Controls", keys: [
    { label: "Send Message", keys: ["↵"] },
    { label: "Toggle Voice Mode", keys: ["V"] },
    { label: "Clear Session", keys: ["⌘", "⇧", "L"] },
    { label: "Search History", keys: ["/"] },
  ]},
  { group: "General", keys: [
    { label: "Open Shortcuts", keys: ["?"] },
    { label: "Close Modals", keys: ["ESC"] },
  ]}
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 sm:p-0 selection:bg-clematis-100">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-page/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-bg-surface border border-border-default rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-8 py-6 border-b border-border-faint flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-soft border border-border-subtle flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-clematis-600" />
                </div>
                <h2 className="font-display font-semibold text-[22px] text-text-heading">Keyboard Shortcuts</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-active text-text-tertiary hover:text-text-primary transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {shortcuts.map((group) => (
                <div key={group.group}>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary mb-6 border-b border-border-faint pb-2">{group.group}</h3>
                  <div className="flex flex-col gap-5">
                    {group.keys.map((s) => (
                      <div key={s.label} className="flex items-center justify-between group">
                        <span className="text-[14px] text-text-secondary group-hover:text-text-primary transition-colors">{s.label}</span>
                        <div className="flex items-center gap-1.5">
                          {s.keys.map((k) => (
                            <kbd key={k} className="min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md bg-bg-elevated border border-border-default text-[12px] font-mono font-bold text-text-primary shadow-sm">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-8 py-5 border-t border-border-faint bg-bg-active/20 flex items-center justify-between">
              <p className="text-[13px] text-text-secondary font-light italic">💡 Mastery tip: Press '?' anytime to open this guide.</p>
              <button onClick={onClose} className="text-[13px] font-bold text-clematis-600 hover:text-clematis-700">Got it</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
