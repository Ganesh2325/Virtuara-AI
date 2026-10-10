"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cookie } from "lucide-react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[420px] z-[200]"
        >
          <div className="bg-bg-elevated/90 backdrop-blur-xl border border-border-subtle rounded-[28px] p-6 shadow-2xl flex flex-col gap-6 selection:bg-clematis-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-soft border border-border-subtle flex items-center justify-center shrink-0">
                <Cookie className="w-6 h-6 text-clematis-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-text-heading mb-1.5 flex items-center gap-2">
                  Personalize Experience
                </h3>
                <p className="text-[14px] text-text-secondary leading-[1.65] font-light">
                  We use cookies to enhance your sessions with Aria, personalize learning content, and analyze our traffic. No data is ever shared with third parties.
                </p>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 rounded-full text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAccept}
                className="flex-1 py-2.5 rounded-xl bg-[#5C4100] text-[#F5F0E8] text-[14px] font-bold shadow-md hover:bg-[#4A3200] transition-all"
              >
                Accept All
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-default text-[14px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-all"
              >
                Manage
              </button>
            </div>

            <div className="flex items-center gap-4 px-2">
              <a href="#" className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest hover:text-clematis-600 transition-colors">Privacy Policy</a>
              <div className="w-1 h-1 rounded-full bg-border-faint" />
              <a href="#" className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest hover:text-clematis-600 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
