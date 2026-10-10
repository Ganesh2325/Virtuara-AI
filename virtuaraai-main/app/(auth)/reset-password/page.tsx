"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import GlowButton from "@/components/shared/GlowButton";

function PasswordStrength({ password }: { password: string }) {
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["var(--color-error)", "var(--color-warning)", "var(--color-info)", "var(--color-success)"];
  if (!password) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-1 flex-1 h-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-300"
            style={{ background: i < strength ? colors[strength - 1] : "rgba(148,163,200,0.15)" }}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-[11px] font-medium w-10 text-right" style={{ color: colors[strength - 1] }}>{labels[strength - 1]}</p>
      )}
    </div>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.push("/login?reset=success");
    }, 2000);
  };

  const inputClasses =
    "w-full px-[16px] py-[11px] bg-bg-overlay border border-border-default rounded-md text-[15px] font-body font-normal text-text-primary placeholder:text-text-placeholder transition-all outline-none hover:border-border-strong focus:border-border-mauve focus:shadow-focus-ring";

  return (
    <div className="min-h-screen flex bg-bg-page relative font-body overflow-hidden">
      {/* LEFT — Marketing panel */}
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
            <ShieldCheck className="w-8 h-8 text-clematis-500" />
          </div>

          <h2 className="font-display font-bold text-[40px] tracking-tight text-text-primary mb-4 leading-tight">
            Secure Your <br />
            <span className="gradient-text-mentor">Account</span>
          </h2>
          <p className="text-text-secondary text-[16px] leading-relaxed max-w-sm">
            Choose a strong password with at least 8 characters to keep your learning progress safe.
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
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent-primary/5 border border-accent-primary/10 mb-4">
            <span className="text-[10px] font-bold tracking-wider text-accent-primary uppercase">Set New Password</span>
          </div>

          <h1 className="font-display font-bold text-[32px] tracking-tight text-text-primary mb-2">Reset Password</h1>
          <p className="text-[15px] text-text-secondary mb-8">Enter your new credentials below.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="px-4 py-2.5 rounded-xl text-[12px] font-medium text-semantic-error-text bg-semantic-error-muted border border-semantic-error-border">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-secondary">New Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClasses} pr-[44px]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-secondary">Confirm Password</label>
              <input
                type={showPwd ? "text" : "password"}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClasses}
              />
            </div>

            <GlowButton type="submit" variant="primary" loading={loading} className="w-full justify-center mt-2">
              {loading ? "Updating..." : "Update Password"}
            </GlowButton>

            <Link href="/login" className="text-center text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors py-2">
              Back to Sign In
            </Link>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}

