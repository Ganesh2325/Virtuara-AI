"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LockKeyhole, MailCheck, ArrowLeft, RefreshCw } from "lucide-react";
import GlowButton from "@/components/shared/GlowButton";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Show sent state regardless — don't reveal if email exists
    } finally {
      setLoading(false);
      setSent(true);
      setResendTimer(60);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(60);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // silent — resend best-effort
    }
  };

  const inputClasses =
    "w-full px-[16px] py-[11px] bg-bg-overlay border border-border-default rounded-md text-[15px] font-body font-normal text-text-primary placeholder:text-text-placeholder placeholder:font-light transition-all outline-none hover:border-border-strong focus:border-border-mauve focus:shadow-focus-ring";

  return (
    <div className="min-h-screen flex bg-bg-page relative font-body overflow-hidden">
      {/* LEFT — Marketing panel (desktop only) */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:flex flex-col justify-center items-start px-16 py-20 flex-1 relative bg-bg-elevated border-r border-border-default overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-full h-[60%] bg-hero-wash pointer-events-none opacity-40" />

        <div className="relative z-10 w-full max-w-md">
          <Link href="/" className="flex items-center gap-1 mb-12">
            <span className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Virtuara</span>
            <span className="font-display font-extrabold text-2xl text-accent-primary">·AI</span>
          </Link>

          <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border-default flex items-center justify-center shadow-sm mb-6">
            <LockKeyhole className="w-8 h-8 text-clematis-500" />
          </div>

          <h2 className="font-display font-bold text-[40px] tracking-tight text-text-primary mb-4 leading-tight">
            Reset Your <br />
            <span className="gradient-text-mentor">Password</span>
          </h2>
          <p className="text-text-secondary text-[16px] leading-relaxed max-w-sm">
            Enter your email and we'll send you instructions to get back into your account.
          </p>
        </div>
      </motion.div>

      {/* RIGHT — Form panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="flex-1 flex items-center justify-center p-8 bg-bg-surface relative"
      >
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-accent-primary opacity-[0.03] blur-[120px] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent-primary/5 border border-accent-primary/10 mb-4">
                  <span className="text-[10px] font-bold tracking-wider text-accent-primary uppercase">Password Reset</span>
                </div>

                <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary mb-2">Forgot your password?</h1>
                <p className="text-[15px] text-text-secondary mb-8">We'll email you a secure link.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-text-secondary">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClasses}
                    />
                  </div>

                  <GlowButton type="submit" variant="primary" loading={loading} className="w-full justify-center">
                    {loading ? "Sending..." : "Send Reset Link"}
                  </GlowButton>

                  <Link href="/login" className="flex items-center justify-center gap-2 text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors mt-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </Link>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", damping: 20 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-semantic-success-muted rounded-full flex items-center justify-center mx-auto mb-8 text-semantic-success border border-semantic-success-border/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                  <MailCheck className="w-10 h-10" />
                </div>

                <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary mb-3">Check Your Inbox</h1>
                <p className="text-[15px] text-text-secondary mb-8 leading-relaxed">
                  We sent a reset link to <span className="text-text-primary font-medium">{email}</span>. It expires in 15 minutes.
                </p>

                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-bg-elevated border border-border-default flex flex-col items-center gap-3">
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

                  <Link href="/login" className="flex items-center justify-center gap-2 text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors py-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

