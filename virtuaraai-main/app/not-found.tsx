"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import GlowButton from "@/components/shared/GlowButton";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none" style={{ backgroundColor: "var(--clematis-300)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ backgroundColor: "var(--mist-300)" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10 max-w-md w-full"
      >
        <div className="w-20 h-20 bg-bg-surface border border-border-default rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
          <Compass className="w-10 h-10 text-text-tertiary" strokeWidth={1.5} />
        </div>
        
        <h1 className="font-display font-semibold text-[120px] text-text-heading leading-none tracking-tighter mb-4">
          404
        </h1>
        <h2 className="font-display font-medium text-[24px] text-text-primary mb-3">
          Lost in the virtual space
        </h2>
        <p className="text-[15px] text-text-secondary leading-relaxed mb-10">
          The page you are looking for doesn't exist or has been moved. Let's get you back on track with your learning.
        </p>

        <GlowButton href="/" variant="primary" className="w-full justify-center py-3">
          Return to Dashboard
        </GlowButton>
      </motion.div>
    </div>
  );
}
