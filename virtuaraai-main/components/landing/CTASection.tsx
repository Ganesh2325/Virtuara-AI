"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import GlowButton from "@/components/shared/GlowButton";

export default function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-32 relative overflow-hidden bg-bg-page font-body antialiased"
    >
      {/* Warm accent background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% 100%, rgba(138,98,0,0.1), transparent 60%)",
        }}
      />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center gap-8"
        >
          <span
            className="px-5 py-2 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase bg-gold-500/10 border border-border-gold text-text-gold-deep shadow-sm antialiased"
          >
            ✦ Start Free — No Credit Card Required
          </span>

          <h2 className="font-display font-bold text-text-heading tracking-tight antialiased" style={{ fontSize: "clamp(44px, 7vw, 84px)", lineHeight: 1.02 }}>
            Ready to Meet Your{" "}
            <br />
            <span className="text-text-gold-deep">AI Mentor?</span>
          </h2>

          <p className="text-text-secondary font-bold text-[19px] max-w-[580px] leading-[1.65] antialiased">
            Join thousands of students learning faster, smarter, and deeper with institutional-grade AI.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4"
          >
            <GlowButton href="/signup" variant="primary" className="text-[17px] px-12 py-5">
              Start Learning Free →
            </GlowButton>
          </motion.div>

          <p className="text-text-tertiary font-bold text-[12px] tracking-[0.08em] uppercase mt-4 antialiased">
            ✓ Free forever plan available &nbsp;·&nbsp; ✓ No commitment &nbsp;·&nbsp; ✓ Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}
