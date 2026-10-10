"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MessageSquare, Mic, BarChart3 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Start a Session",
    desc: "Choose a subject and jump straight into a live session with your AI mentor. No setup required — just pick a topic and go.",
    icon: MessageSquare,
    color: "var(--gold-500)",
  },
  {
    number: "02",
    title: "Talk to Your Mentor",
    desc: "Ask questions, get explanations, and have real conversations with Aria. She listens, adapts, and teaches exactly like a human tutor.",
    icon: Mic,
    color: "var(--gold-400)",
  },
  {
    number: "03",
    title: "Track Your Mastery",
    desc: "After every session, see your progress, skill gains, and what to tackle next. Real metrics, real growth.",
    icon: BarChart3,
    color: "var(--gold-600)",
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="py-32 bg-bg-page font-body relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-[100%] blur-[120px] bg-accent-primary opacity-[0.05] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <h2 className="font-display font-semibold text-4xl md:text-5xl text-text-heading mb-6 tracking-tight antialiased">
            How Virtuara AI Works
          </h2>
          <p className="text-text-secondary font-bold text-[18px] max-w-[500px] mx-auto antialiased">
            A precise, institutional-grade three-step process to transform your mastery.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connecting dashed line */}
          <div className="hidden md:block absolute top-[45px] left-1/2 -translate-x-1/2 w-2/3 h-px border-t border-dashed border-border-gold" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            // Map the old hex array dynamically to CSS variables based on iteration
            const varColor = i === 0 ? "var(--text-gold-deep)" : i === 1 ? "var(--text-heading)" : "var(--text-gold-deep)";

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                whileHover={{ y: -4 }}
                className="relative flex flex-col items-center text-center p-10 rounded-[24px] bg-bg-surface border border-border-subtle hover:border-border-gold cursor-default transition-all shadow-sm"
              >
                {/* Step number watermark */}
                <span
                  className="absolute top-2 left-6 font-display font-bold text-[84px] leading-none opacity-[0.03] select-none text-text-gold-deep"
                >
                  {step.number}
                </span>

                {/* Icon */}
                <div
                  className="w-[90px] h-[90px] rounded-[24px] flex items-center justify-center mb-8 relative bg-bg-page border border-border-gold shadow-sm"
                  style={{ zIndex: 2 }}
                >
                   <div className="absolute inset-0 opacity-10 rounded-[24px]" style={{ background: varColor }} />
                  <Icon className="w-9 h-9" style={{ color: varColor }} />
                </div>

                <h3 className="font-display font-semibold text-[22px] text-text-heading mb-4 tracking-tight antialiased">
                  {step.title}
                </h3>
                <p className="text-text-secondary leading-[1.7] text-[15px] font-bold antialiased">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
