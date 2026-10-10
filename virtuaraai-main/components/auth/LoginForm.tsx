"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import OAuthButtons from "@/components/auth/OAuthButtons";
import GlowButton from "@/components/shared/GlowButton";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const e = { email: "", password: "" };
    if (!form.email || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return !Object.values(e).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    const result = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
      name: form.email.split("@")[0],
    });

    setLoading(false);

    if (result?.ok) {
      const alreadyOnboarded = localStorage.getItem(`onboarding_${form.email}`) === "true";
      router.push(alreadyOnboarded ? "/dashboard" : "/onboarding");
    } else {
      setServerError("Invalid email or password. Try any email/password for demo.");
    }
  };

  const inputClasses =
    "w-full px-4 py-3 bg-bg-surface border border-border-subtle rounded-lg text-[15px] font-body font-medium text-text-primary placeholder:text-text-tertiary placeholder:font-light transition-all outline-none hover:border-border-default focus:border-gold-500 focus:shadow-[0_0_0_4px_rgba(138,98,0,0.06)] invalid:focus:border-color-error-border shadow-sm";

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div className="text-center mb-4">
        <h2 className="font-display font-semibold text-[36px] tracking-tight text-text-heading antialiased">Welcome back</h2>
        <p className="text-[16px] font-medium mt-1 text-text-secondary antialiased">Continue your mastery journey</p>
      </div>

      {/* Success banner */}
      {registered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="px-4 py-3 flex items-center gap-2 rounded-xl text-[13px] font-bold text-text-gold-deep bg-gold-500/5 border border-border-gold-faint antialiased"
        >
          ✦ Account recognized. Please sign in to enter the vault.
        </motion.div>
      )}

      {serverError && (
        <div className="px-4 py-3 flex items-center gap-2 rounded-xl text-[12px] font-bold text-semantic-error-text bg-semantic-error-muted border border-semantic-error-border antialiased">
          ✕ {serverError}
        </div>
      )}

      <OAuthButtons mode="login" callbackUrl="/onboarding" />

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-[12px] px-2 text-text-tertiary font-bold uppercase tracking-[0.12em] opacity-80 antialiased">or email vault</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      <div className="flex flex-col gap-2 mb-1">
        <label className="font-body text-[12px] font-bold text-text-tertiary uppercase tracking-[0.08em] antialiased">Email Address</label>
        <input
          type="email" placeholder="Email Address" value={form.email}
          onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }}
          className={inputClasses}
        />
        {errors.email && <div className="text-[12px] font-medium text-semantic-error-text mt-[2px]">{errors.email}</div>}
      </div>

      <div className="flex flex-col gap-2 mb-1">
        <label className="font-body text-[12px] font-bold text-text-tertiary uppercase tracking-[0.08em] antialiased">Password</label>
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"} placeholder="Password" value={form.password}
            onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: "" }); }}
            className={`${inputClasses} pr-[44px]`}
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-[14px] top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <div className="text-[12px] font-medium text-semantic-error-text mt-[2px]">{errors.password}</div>}
      </div>

      <div className="text-right">
        <Link href="/forgot-password" title="Reset your password"
          className="font-body text-[13px] text-text-gold-deep hover:text-text-gold transition-all font-bold antialiased">
          Forgot your password?
        </Link>
      </div>

      <GlowButton type="submit" variant="primary" loading={loading}
        className="w-full justify-center mt-3">
        {loading ? "Signing in..." : "Sign In"}
      </GlowButton>

      <p className="text-center text-[12px] mt-2 text-text-tertiary font-bold opacity-60 antialiased">
        💡 Demo: enter any credentials to enter
      </p>

      <p className="text-center text-[15px] text-text-secondary mt-2 font-medium antialiased">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-text-gold-deep hover:text-text-gold font-bold underline decoration-text-gold-deep/30 underline-offset-4">Sign up</Link>
      </p>
    </motion.form>
  );
}
