"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import GlowButton from "@/components/shared/GlowButton";
import NeuralBackground from "@/components/shared/NeuralBackground";
import { Star } from "lucide-react";

const AVATAR_INITIALS = ["AR", "KL", "MJ", "SP", "RT"];
const AVATAR_COLORS = [
  ["#00D4FF", "#7B2FFF"],
  ["#7B2FFF", "#00FFB2"],
  ["#FFB300", "#00D4FF"],
  ["#00FFB2", "#7B2FFF"],
  ["#7B2FFF", "#FFB300"],
];

const floatingBadges = [
  { label: "🧠 Adaptive AI", position: "top-10 left-0", delay: 0 },
  { label: "🎯 Personalized", position: "top-10 right-0", delay: 0.5 },
  { label: "💬 Real-time Chat", position: "bottom-20 left-0", delay: 1 },
  { label: "📊 Tracks Progress", position: "bottom-20 right-0", delay: 1.5 },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16 font-body bg-bg-page"
    >
      {/* Warm Parchment Accent */}
      <div 
        className="absolute inset-x-0 -top-40 h-[120vh] pointer-events-none opacity-20 z-0"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(138,98,0,0.1), transparent 70%)"
        }}
      />

      <NeuralBackground particleCount={80} className="opacity-30" />

      <div className="max-w-7xl mx-auto px-6 w-full py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* LEFT — Text */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col gap-8"
        >
          {/* Badge */}
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="self-start px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase text-text-gold-deep border border-border-gold bg-gold-500/10 antialiased"
          >
            ✦ The Future of Luxury Intelligence
          </motion.span>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="flex flex-col gap-1"
          >
            <h1 className="font-display font-bold leading-[1.04] tracking-tight text-text-heading" style={{ fontSize: "clamp(52px, 8vw, 84px)" }}>
              Meet Your
              <br />
              <span className="text-text-gold-deep">AI Mentor</span>
              <br />
              That Never Stops
            </h1>
          </motion.div>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-[19px] text-text-secondary font-bold max-w-[520px] leading-[1.7] antialiased"
          >
            Experience personalized learning with a humanoid AI mentor that adapts to your pace,
            understands your nuances, and teaches with institutional-grade precision.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap items-center gap-5 mt-2"
          >
            <GlowButton href="/signup" variant="primary" className="px-10 py-4 text-[16px]">
              Get Started
            </GlowButton>
            <GlowButton href="#how-it-works" variant="ghost-gold" className="px-10 py-4 text-[16px]">
              See Demo
            </GlowButton>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex items-center gap-5 flex-wrap mt-[16px]"
          >
            <div className="flex items-center">
              {AVATAR_INITIALS.map((initials, i) => (
                <div
                  key={i}
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[11px] font-bold text-white border-[2px] border-bg-page shadow-sm"
                  style={{
                    background: i % 2 === 0 ? "var(--text-gold-deep)" : "var(--text-heading)",
                    marginLeft: i > 0 ? "-14px" : 0,
                    zIndex: AVATAR_INITIALS.length - i,
                    position: "relative",
                  }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <div>
              <p className="text-text-tertiary text-[14px] font-bold tracking-tight">Join 12,400+ members in our private beta</p>
              <div className="flex items-center gap-1.5 mt-[2px]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-[14px] h-[14px] fill-text-gold-deep text-text-gold-deep" />
                ))}
                <span className="text-text-gold-deep text-[12px] font-bold ml-1 tracking-wider uppercase">Institutional Grade</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* RIGHT — Avatar Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="relative flex items-center justify-center lg:justify-end"
        >
          {/* Main Container */}
          <div className="relative w-[min(480px,95vw)] h-[min(480px,95vw)] flex items-center justify-center">
            {/* Soft Ambient Gold Glow */}
            <div className="absolute inset-0 rounded-full bg-gold-500/10 blur-[80px]" />
            
            {/* Spinning Gold Perimeter */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-border-gold"
            />

            {/* The Orb */}
            <div className="relative w-full h-full p-12">
              <div className="w-full h-full rounded-full border border-border-gold bg-bg-surface shadow-lg overflow-hidden relative">
                <Image
                  src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80"
                  alt="AI Mentor Avatar"
                  fill
                  className="object-cover opacity-60 mix-blend-multiply hover:grayscale-0 transition-all duration-700"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-page/20 to-bg-page/40" />
              </div>
            </div>

            {/* Floating badges - repositioned and restyled */}
            {floatingBadges.map((badge, i) => (
              <motion.div
                key={badge.label}
                className={`absolute ${badge.position} bg-bg-surface/90 backdrop-blur-md border border-border-gold shadow-md rounded-lg px-4 py-2.5 z-20`}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: badge.delay }}
              >
                <span className="text-[12px] font-bold tracking-wider uppercase text-text-gold-deep antialiased">{badge.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
