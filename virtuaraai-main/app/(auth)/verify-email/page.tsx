"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react";
import GlowButton from "@/components/shared/GlowButton";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResend = () => {
    if (resendTimer > 0) return;
    setResendTimer(60);
    // Trigger resend logic
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page relative font-body px-6 overflow-hidden">
      {/* Background washes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-primary opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-clematis-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-bg-surface border border-border-default rounded-[32px] shadow-sm p-8 md:p-12 relative z-10 text-center"
      >
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1 mb-8">
            <span className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Virtuara</span>
            <span className="font-display font-extrabold text-2xl text-accent-primary">·AI</span>
          </Link>

          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 bg-accent-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-accent-primary/10 shadow-[0_0_40px_rgba(108,75,145,0.05)]"
          >
            <Mail className="w-10 h-10 text-accent-primary" />
          </motion.div>

          <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary mb-3">Verify Your Email</h1>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            We've sent a verification link to <br />
            <span className="text-text-primary font-medium">{email}</span>. <br />
            Click it to activate your account.
          </p>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <GlowButton variant="primary" className="w-full justify-center py-4" onClick={() => window.open("https://mail.google.com", "_blank")}>
            Open Mail App
            <ExternalLink className="w-4 h-4 ml-2 opacity-50" />
          </GlowButton>

          <div className="p-4 rounded-2xl bg-bg-elevated border border-border-default flex flex-col items-center gap-2">
            <p className="text-[13px] text-text-tertiary">Didn't get the email?</p>
            <button
              onClick={handleResend}
              disabled={resendTimer > 0}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent-primary hover:text-accent-strong disabled:text-text-tertiary transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendTimer > 0 ? "animate-spin-slow opacity-50" : ""}`} />
              {resendTimer > 0 ? `Resend In ${resendTimer}s` : "Resend Link"}
            </button>
          </div>
        </div>

        <Link href="/login" className="flex items-center justify-center gap-2 text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
