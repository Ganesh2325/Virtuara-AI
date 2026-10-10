"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import GlowButton from "@/components/shared/GlowButton";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15 pointer-events-none bg-semantic-error-border" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-bg-surface border border-border-default rounded-[24px] shadow-sm p-8 md:p-10 text-center relative z-10"
      >
        <div className="w-16 h-16 bg-semantic-error-muted rounded-full flex items-center justify-center mx-auto mb-6 border border-semantic-error-border text-semantic-error-text">
          <AlertCircle className="w-8 h-8" strokeWidth={2} />
        </div>
        
        <h2 className="font-display font-semibold text-[28px] text-text-heading mb-3 tracking-tight">
          System Error
        </h2>
        <p className="text-[15px] text-text-secondary leading-relaxed mb-8">
          Aria encountered an unexpected glitch in the matrix. Don't worry, your progress is saved.
        </p>

        <div className="flex flex-col gap-3">
          <GlowButton onClick={reset} variant="primary" className="w-full justify-center">
            Try again
          </GlowButton>
          <GlowButton href="/" variant="ghost" className="w-full justify-center">
            Return home
          </GlowButton>
        </div>
      </motion.div>
    </div>
  );
}
