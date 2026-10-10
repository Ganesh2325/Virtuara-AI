"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import Image from "next/image";

function LoginPageInner() {
  return (
    <div className="min-h-screen flex bg-bg-page relative font-body overflow-hidden">
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
            Welcome{" "}
            <br />
            <span className="text-text-gold-deep">Back</span>
          </h2>
          <p className="mb-14 text-text-secondary text-[18px] leading-[1.65] max-w-sm font-medium antialiased">
            Continue your elite learning journey with Aria, your personal AI mentor. Your progress is preserved in the vault.
          </p>

          {/* Avatar image restyled */}
          <div className="relative w-full h-[360px] rounded-3xl overflow-hidden border border-border-gold-faint shadow-2xl mt-auto perspective-1000 group">
            <Image
              src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80"
              alt="AI Mentor"
              fill
              className="object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8">
              <p className="font-display font-semibold text-xl text-white tracking-tight antialiased">Aria</p>
              <p className="text-[14px] text-gold-400 font-bold flex items-center mt-1 uppercase tracking-widest antialiased">
                <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,1)] animate-pulse" />
                Active in vault
              </p>
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
          <LoginForm />
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
