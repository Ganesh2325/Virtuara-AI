"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import OAuthButtons from "@/components/auth/OAuthButtons";
import GlowButton from "@/components/shared/GlowButton";
import { registerUser } from "@/lib/api";

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
            className="flex-1 rounded-full transition-all duration-500"
            style={{ background: i < strength ? colors[strength - 1] : "rgba(0,0,0,0.05)" }}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-[12px] font-body font-medium w-10 text-right" style={{ color: colors[strength - 1] }}>{labels[strength - 1]}</p>
      )}
    </div>
  );
}

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({ name: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const e = { name: "", email: "", password: "" };
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return !Object.values(e).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!agreed) { setServerError("Please agree to the Terms of Service."); return; }

    setLoading(true);
    setServerError("");

    try {
      await registerUser({
        email: form.email,
        full_name: form.name,
        password: form.password,
        password_confirm: form.password,
      });
      router.push("/login?registered=true");
    } catch (err: any) {
      setServerError(err?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
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
        <h2 className="font-display font-semibold text-[36px] tracking-tight text-text-heading antialiased">Create your account</h2>
        <p className="text-[16px] font-medium mt-1 text-text-secondary antialiased">Start your elite learning journey today</p>
      </div>

      {serverError && (
        <div className="px-4 py-3 flex items-center gap-2 rounded-xl text-[12px] font-bold text-semantic-error-text bg-semantic-error-muted border border-semantic-error-border antialiased">
          ✕ {serverError}
        </div>
      )}

      <OAuthButtons mode="signup" callbackUrl="/onboarding" />

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-[12px] px-2 text-text-tertiary font-bold uppercase tracking-[0.12em] opacity-80 antialiased">or create with email</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* Full name */}
      <div className="flex flex-col gap-2 mb-1">
        <label className="font-body text-[12px] font-bold text-text-tertiary uppercase tracking-[0.08em] antialiased">Full Name</label>
        <input
          type="text" placeholder="Full Name" value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: "" }); }}
          className={inputClasses}
        />
        {errors.name && <div className="text-[12px] font-medium text-semantic-error-text mt-[2px]">{errors.name}</div>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-2 mb-1">
        <label className="font-body text-[12px] font-bold text-text-tertiary uppercase tracking-[0.08em] antialiased">Email Address</label>
        <input
          type="email" placeholder="Email Address" value={form.email}
          onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }}
          className={inputClasses}
        />
        {errors.email && <div className="text-[12px] font-medium text-semantic-error-text mt-[2px]">{errors.email}</div>}
      </div>

      {/* Password */}
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
        <PasswordStrength password={form.password} />
      </div>

      {/* Terms */}
      <label className="flex items-start gap-4 cursor-pointer mt-3 group">
        <div className="relative flex items-center mt-1">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="peer w-4 h-4 opacity-0 absolute cursor-pointer" />
          <div className="w-4 h-4 border border-border-subtle rounded bg-bg-surface peer-checked:bg-text-gold-deep peer-checked:border-text-gold-deep transition-all flex items-center justify-center shadow-sm">
            {agreed && <span className="text-[10px] text-white font-bold">✓</span>}
          </div>
        </div>
        <span className={`text-[13px] leading-relaxed transition-colors ${agreed ? "text-text-primary" : "text-text-tertiary"} font-bold antialiased`}>
          I agree to the{" "}
          <a href="#" className="text-text-gold-deep hover:text-text-gold font-bold underline decoration-text-gold-deep/30 underline-offset-4">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-text-gold-deep hover:text-text-gold font-bold underline decoration-text-gold-deep/30 underline-offset-4">Privacy Policy</a>
        </span>
      </label>

      <GlowButton type="submit" variant="primary" loading={loading}
        className="w-full justify-center mt-3">
        {loading ? "Creating account..." : "Create Account"}
      </GlowButton>

      <p className="text-center text-[15px] text-text-secondary mt-2 font-medium antialiased">
        Already have an account?{" "}
        <Link href="/login" className="text-text-gold-deep hover:text-text-gold font-bold underline decoration-text-gold-deep/30 underline-offset-4">Sign in</Link>
      </p>
    </motion.form>
  );
}
