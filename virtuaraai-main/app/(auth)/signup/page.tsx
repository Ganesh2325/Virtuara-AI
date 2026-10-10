"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import SignupForm from "@/components/auth/SignupForm";
import AvatarOrb from "@/components/shared/AvatarOrb";
import Link from "next/link";
import { useToast, ToastContainer } from "@/hooks/useToast";
import { useEffect } from "react";

function SignupPageInner() {
  const { toasts, addToast, registerHandler, removeToast } = useToast();

  useEffect(() => {
    const unregister = registerHandler(addToast);
    return unregister;
  }, [registerHandler, addToast]);

  return (
    <div className="min-h-screen flex bg-bg-page relative font-body overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* LEFT — Marketing panel (desktop only) */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:flex flex-col justify-center items-start px-20 py-20 flex-1 relative bg-bg-surface border-r border-border-subtle overflow-hidden"
      >
        {/* Subtle gold wash effect */}
        <div className="absolute top-0 right-0 w-full h-[60%] bg-[radial-gradient(circle_at_100%_0%,rgba(212,175,55,0.05),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-[2px] mb-16">
            <div className="w-5 h-5 bg-gold-500 rounded-sm rotate-45 mr-1.5 shadow-sm" />
            <span className="font-display font-semibold tracking-tight text-[24px] text-text-heading antialiased">Virtuara</span>
            <span className="font-display font-semibold tracking-tight text-[24px] text-text-gold-deep antialiased">AI</span>
          </Link>

          <h2 className="font-display font-semibold text-[48px] tracking-tight text-text-heading mb-6 leading-[1.05] antialiased">
            Start Learning{" "}
            <br />
            <span className="text-text-gold-deep">Today</span>
          </h2>
          <p className="mb-10 text-text-secondary text-[18px] leading-[1.65] max-w-sm font-medium antialiased">
            Your elite AI mentor is waiting in the vault. Join the top 1% of learners transforming their mastery.
          </p>

          <ul className="flex flex-col gap-4 mb-16">
            {[
              "Free access to core training vault",
              "Institutional AI that adapts to you",
              "Real-time neuro-pathway tracking",
            ].map((item) => (
              <li key={item} className="flex items-center gap-4 group">
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold bg-gold-500/10 text-text-gold-deep border border-gold-400/20 shadow-sm group-hover:scale-110 transition-transform">
                  ✓
                </span>
                <span className="text-text-primary text-[16px] font-bold group-hover:text-text-heading transition-colors antialiased">{item}</span>
              </li>
            ))}
          </ul>

          {/* Avatar orb - repositioned */}
          <div className="flex justify-center mt-auto pb-12 w-full">
            <div className="relative">
               <div className="absolute inset-x-0 -bottom-4 h-8 bg-gold-500/5 blur-xl rounded-full" />
               <AvatarOrb size={240} animated speaking={false} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* RIGHT — Auth form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="flex-1 flex items-center justify-center p-8 bg-bg-page relative"
      >
        {/* Subtle gold halo */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gold-500/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          <SignupForm />
        </div>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  );
}
